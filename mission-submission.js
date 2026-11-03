// DEVELOPMENT ONLY: not wired into index.html.
// Cloud photo uploader must succeed before a mission can be submitted.
// A trusted server-side check and tested rules are still required before going live.
import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { auth } from "./firebase-auth.js";
import { db } from "./group-service.js";
import { validateSubmission } from "./mission-schema.js";
const safeId=id=>/^[A-Za-z0-9_-]{1,60}$/.test(id);
export async function submitGroupMission({activityId,groupId,missionId,answers,photoPaths}) {
  if(!auth?.currentUser?.isAnonymous) throw new Error("請先以學生身分登入");
  if(!safeId(activityId)||!safeId(groupId)) throw new Error("小組資訊不正確");
  validateSubmission(missionId,answers,photoPaths);
  const uid=auth.currentUser.uid;
  const memberRef=doc(db,"activities",activityId,"groups",groupId,"members",uid);
  const missionRef=doc(db,"activities",activityId,"groups",groupId,"missions",String(missionId));
  // A transaction makes submission create-only, so two group members cannot both win.
  await runTransaction(db,async tx=>{
    const member=await tx.get(memberRef);
    if(!member.exists()) throw new Error("你尚未加入這個小組");
    const previous=await tx.get(missionRef);
    if(previous.exists()) throw new Error("這關已有組員提交，請更新頁面查看");
    tx.set(missionRef,{
      status:"completed",
      answers,
      photoPaths,
      submittedByUid:uid,
      submittedByCode:member.data().studentCode,
      submittedAt:serverTimestamp()
    });
  });
  // UI must show completion only after the server transaction resolves.
  return {missionId:Number(missionId),status:"completed"};
}
