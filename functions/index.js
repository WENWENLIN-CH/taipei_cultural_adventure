// DEVELOPMENT: DO NOT DEPLOY until integration + emulator tests pass.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { PHOTO_KEYS, validateGroupPayload, parseVerifiedPhotoPath } from "./submission-core.js";

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket("taipei-cultural-adventure.firebasestorage.app");

function bad(message) {return new HttpsError("failed-precondition",message);}
export const submitGroupMission = onCall({
  region:"asia-east1", maxInstances:2, memory:"256MiB", timeoutSeconds:60
}, async request=>{
  if(!request.auth?.uid || request.auth.token.firebase?.sign_in_provider!=="anonymous")
    throw new HttpsError("unauthenticated","請先匿名登入");
  let input;
  try {input=validateGroupPayload(request.data);}
  catch(e){throw new HttpsError("invalid-argument",e.message);}
  // Limit rollout to nonstudent demo activity, even if invoked directly by a client.
  if(input.activityId!=="demo2026") throw new HttpsError("permission-denied","目前只開放測試活動");
  const uid=request.auth.uid;
  const base=`activities/${input.activityId}/groups/${input.groupId}`;
  const memberRef=db.doc(`${base}/members/${uid}`);
  const member=await memberRef.get();
  if(!member.exists) throw new HttpsError("permission-denied","你不是這個小組的成員");

  // Every photo must correspond to an uploaded object owned by a CURRENT member
  // of the SAME group. Never trust URL or storagePath strings supplied by browsers.
  for(const key of PHOTO_KEYS[input.missionId]){
    let info;
    try{
      info=parseVerifiedPhotoPath(input.photoPaths[key],{...input,photoKey:key});
    }catch(e){throw new HttpsError("invalid-argument",e.message);}
    const uploader=await db.doc(`${base}/members/${info.uploaderUid}`).get();
    if(!uploader.exists) throw bad(`照片 ${key} 的上傳者不是本組成員`);
    const file=bucket.file(info.path);
    const [exists]=await file.exists();
    if(!exists) throw bad(`照片 ${key} 尚未真正上傳`);
    const [meta]=await file.getMetadata();
    const size=Number(meta.size);
    if(meta.contentType!=="image/jpeg" || !Number.isFinite(size) || size<=0 || size>1024*1024)
      throw bad(`照片 ${key} 類型或大小不正確`);
    // Check real JPEG magic bytes, not merely MIME metadata.
    const bytes=await new Promise((resolve,reject)=>{
      const chunks=[];
      file.createReadStream({start:0,end:2})
        .on("data",chunk=>chunks.push(chunk))
        .on("error",reject)
        .on("end",()=>resolve(Buffer.concat(chunks)));
    });
    if(bytes.length<3 || bytes[0]!==0xff || bytes[1]!==0xd8 || bytes[2]!==0xff)
      throw bad(`照片 ${key} 不是有效的 JPEG 開頭`);
  }
  const missionRef=db.doc(`${base}/missions/${input.missionId}`);
  await db.runTransaction(async tx=>{
    const [memberNow,existing]=await Promise.all([tx.get(memberRef),tx.get(missionRef)]);
    if(!memberNow.exists) throw new HttpsError("permission-denied","組員資格已失效");
    if(existing.exists) throw new HttpsError("already-exists","這關已有共同成果，不可重複提交");
    tx.create(missionRef,{
      status:"completed",
      answers:input.answers,
      photoPaths:input.photoPaths,
      submittedByUid:uid,
      submittedByCode:memberNow.data().studentCode,
      submittedAt:FieldValue.serverTimestamp()
    });
  });
  // Derive final unlock from all five completed documents when displaying it;
  // do not grant completion merely because upload succeeded.
  return {missionId:input.missionId,status:"completed"};
});
