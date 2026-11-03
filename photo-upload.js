// Photo preprocessing and upload foundation, development branch.
// Upload does not complete a mission. Do not enable live uploads until rules,
// quotas and server-side verification of photo existence are ready.
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
export function storagePhotoPath({activityId,groupId,missionId,uid,photoKey,nonce}) {
  if(![activityId,groupId,uid].every(s=>typeof s==="string"&&ID_PATTERN.test(s)))
    throw new Error("活動或組別身分不正確");
  const keys=REQUIRED_PHOTO_KEYS[Number(missionId)];
  if(!keys?.includes(photoKey)) throw new Error("不符合該關的照片欄位");
  if(!/^[a-f0-9]{32}$/.test(nonce)) throw new Error("照片識別碼格式不正確");
  return `activities/${activityId}/groups/${groupId}/missions/${missionId}/${uid}/${photoKey}-${nonce}.jpg`;
}
export async function uploadGroupPhoto({missionId,photoKey,blob,onProgress}) {
  if(!storage || !auth?.currentUser?.isAnonymous) throw new Error("必須先匿名登入");
  const group=await resumeGroup();
  if(!group) throw new Error("請先加入小組");
  if(!(blob instanceof Blob) || blob.type!=="image/jpeg" || blob.size>MAX_OUTPUT_BYTES)
    throw new Error("請先完成 JPEG 壓縮");
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
  const path=storagePhotoPath({...group,missionId,photoKey,uid:auth.currentUser.uid,nonce});
  onProgress?.("上傳中");
  const obj=ref(storage,path);
  await uploadBytes(obj,blob,{contentType:"image/jpeg"});
  const metadata=await getMetadata(obj);
  if(metadata.contentType!=="image/jpeg"||Number(metadata.size)!==blob.size)
    throw new Error("上傳後檔案資訊不一致，請勿提交任務");
  onProgress?.("照片已上傳至雲端（尚未完成關卡）");
  return {path,bytes:blob.size};
}
