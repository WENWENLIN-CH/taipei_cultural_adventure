// Trusted application handler, dependency-injected for emulator integration tests.
// Storage contents must be verified server-side before a Firestore completion is created.
import {PHOTO_KEYS, validateGroupPayload, parseVerifiedPhotoPath} from "./submission-core.js";

export function createSubmissionHandler({db,bucket,serverTimestamp,makeError}) {
  const fail=(code,message)=>{throw makeError(code,message);};
  return async function handleSubmission({uid,anonymous,data}) {
    if(!uid || !anonymous) return fail("unauthenticated","請先匿名登入");
    let input;
    try{input=validateGroupPayload(data);}
    catch(e){return fail("invalid-argument",e.message);}
    if(input.activityId!=="demo2026") return fail("permission-denied","目前只開放測試活動");
    const base=`activities/${input.activityId}/groups/${input.groupId}`;
    const memberRef=db.doc(`${base}/members/${uid}`);
    const member=await memberRef.get();
    if(!member.exists) return fail("permission-denied","你不是這個小組的成員");

    const verified=[];
    for(const key of PHOTO_KEYS[input.missionId]){
      let info;
      try{info=parseVerifiedPhotoPath(input.photoPaths[key],{...input,photoKey:key});}
      catch(e){return fail("invalid-argument",e.message);}
      const uploader=await db.doc(`${base}/members/${info.uploaderUid}`).get();
      if(!uploader.exists) return fail("failed-precondition",`照片 ${key} 的上傳者不是本組成員`);
      const file=bucket.file(info.path);
      const [exists]=await file.exists();
      if(!exists) return fail("failed-precondition",`照片 ${key} 尚未真正上傳`);
      const [meta]=await file.getMetadata();
      const size=Number(meta.size);
      if(meta.contentType!=="image/jpeg" || !Number.isFinite(size) || size<=0 || size>1024*1024)
        return fail("failed-precondition",`照片 ${key} 類型或大小不正確`);
      const bytes=await new Promise((resolve,reject)=>{
        const chunks=[];
        file.createReadStream({start:0,end:2})
          .on("data",chunk=>chunks.push(chunk))
          .on("error",reject)
          .on("end",()=>resolve(Buffer.concat(chunks)));
      });
      if(bytes.length<3 || bytes[0]!==0xff || bytes[1]!==0xd8 || bytes[2]!==0xff)
        return fail("failed-precondition",`照片 ${key} 不是有效的 JPEG 開頭`);
      verified.push({key,path:info.path});
    }

    const missionRef=db.doc(`${base}/missions/${input.missionId}`);
    await db.runTransaction(async tx=>{
      const [memberNow,existing]=await Promise.all([tx.get(memberRef),tx.get(missionRef)]);
      if(!memberNow.exists) return fail("permission-denied","組員資格已失效");
      if(existing.exists) return fail("already-exists","這關已有共同成果，不可重複提交");
      tx.create(missionRef,{
        status:"completed", answers:input.answers, photoPaths:input.photoPaths,
        submittedByUid:uid, submittedByCode:memberNow.data().studentCode,
        submittedAt:serverTimestamp()
      });
    });
    return {missionId:input.missionId,status:"completed"};
  };
}
