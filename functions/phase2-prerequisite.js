// Rehearsal-only server prerequisite checks; not imported by live callables.
// Read-only checks; the submission handler owns final member and duplicate verification.
import {allowPhase2Submission} from "./phase2-authorization.js";
export async function requirePhase2Prerequisites({db,data,uid,anonymous,makeError}){
 const fail=(code,msg)=>{throw makeError(code,msg);};
 if(!anonymous||typeof uid!=="string"||!uid)return fail("unauthenticated","需要匿名學生身分");
 if(!allowPhase2Submission(data))return fail("permission-denied","僅允許核准的第二階段模擬活動與小組");
 const base=`activities/${data.activityId}/groups/${data.groupId}`;
 const member=await db.doc(`${base}/members/${uid}`).get();
 if(!member.exists||member.data()?.revoked===true)
  return fail("permission-denied","學生不是本組有效成員");
 // Stage 1 has no precondition. Stages 2–5 each require the previous stage.
 if(data.missionId>1){
  const previous=await db.doc(`${base}/missions/${data.missionId-1}`).get();
  if(!previous.exists||previous.data()?.status!=="completed")
   return fail("failed-precondition","請先完成上一關");
 }
 return true;
}
