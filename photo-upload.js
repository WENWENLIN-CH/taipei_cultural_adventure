// Photo preprocessing and upload foundation, development branch.
// Upload does not complete a mission. Do not enable live uploads until rules,
// group submission authorization and server-side photo verification are ready.
// A student can upload only once per photo slot under their own UID.
import { auth } from "./firebase-auth.js";
import { resumeGroup } from "./group-service.js";
import { getStorage, ref, uploadBytes, getMetadata } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";
import { REQUIRED_PHOTO_KEYS } from "./mission-schema.js";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_EDGE = 720;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,60}$/;
const storage = auth ? getStorage(auth.app) : null;

export async function compressPhoto(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/"))
    throw new Error("請先選擇圖片");
  if (file.size > MAX_INPUT_BYTES) throw new Error("照片原始檔超過 12MB");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width,bitmap.height));
    const width = Math.max(1,Math.round(bitmap.width*scale));
    const height = Math.max(1,Math.round(bitmap.height*scale));
    const canvas = document.createElement("canvas");
    canvas.width=width; canvas.height=height;
    canvas.getContext("2d").drawImage(bitmap,0,0,width,height);
    for (const quality of [0.78,0.67,0.53]) {
      const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("圖片轉換失敗")),"image/jpeg",quality));
      if (blob.size <= MAX_OUTPUT_BYTES) return blob;
    }
    throw new Error("壓縮後仍超過 1MB，請選擇其他照片");
  } finally {
    bitmap.close();
  }
}
export function storagePhotoPath({activityId,groupId,missionId,uid,photoKey}) {
  if(![activityId,groupId,uid].every(s=>typeof s==="string"&&ID_PATTERN.test(s)))
    throw new Error("活動或組別身分不正確");
  const keys=REQUIRED_PHOTO_KEYS[Number(missionId)];
  if(!keys?.includes(photoKey)) throw new Error("不符合該關的照片欄位");
  return `activities/${activityId}/groups/${groupId}/missions/${missionId}/${uid}/${photoKey}.jpg`;
}
// Idempotent retry: only reuse an existing object when its stored digest matches
// the actual image bytes. A different photo cannot overwrite an occupied slot.
export async function uploadGroupPhoto({missionId,photoKey,blob,onProgress}) {
  if(!storage || !auth?.currentUser?.isAnonymous) throw new Error("必須先匿名登入");
  const group=await resumeGroup();
  if(!group) throw new Error("請先加入小組");
  if(!(blob instanceof Blob) || blob.type!=="image/jpeg" || blob.size<=0 || blob.size>MAX_OUTPUT_BYTES)
    throw new Error("請先完成 JPEG 壓縮");
  const path=storagePhotoPath({...group,missionId,photoKey,uid:auth.currentUser.uid});
  const obj=ref(storage,path);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer())),b=>b.toString(16).padStart(2,"0")).join("");
  async function verifyExisting() {
    const metadata=await getMetadata(obj);
    if(metadata.contentType!=="image/jpeg" || Number(metadata.size)!==blob.size ||
       metadata.customMetadata?.sha256!==digest) {
      throw new Error("此欄位已有不同照片，不能覆蓋。請聯絡老師處理補拍。");
    }
    onProgress?.("已找到先前上傳成功的相同照片，繼續提交。");
    return {path,bytes:blob.size,reused:true};
  }
  onProgress?.("檢查照片是否已上傳…");
  try {
    return await verifyExisting();
  } catch(e) {
    // A missing file may be created; any other failure (including unauthorized
    // access or a different existing photo) must never trigger a blind upload.
    if(e.code!=="storage/object-not-found") throw e;
  }
  onProgress?.("上傳中…");
  try {
    await uploadBytes(obj,blob,{contentType:"image/jpeg",customMetadata:{sha256:digest}});
  } catch(e) {
    // The server might have committed an upload just before the connection
    // broke, or another request might have raced us. Never assume failure
    // means no object exists; verify the immutable object's digest.
    try {return await verifyExisting();}
    catch(checkError) {
      if(checkError.code==="storage/object-not-found") throw e;
      throw checkError;
    }
  }
  const result=await verifyExisting();
  onProgress?.("照片已上傳至雲端（尚未完成關卡）");
  return result;
}
