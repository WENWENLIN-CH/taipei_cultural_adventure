// Independent student callable wrapper for the Phase2 field activity.
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {auth} from "./firebase-auth.js";
import {resumeGroup} from "./group-service.js";
import {validateSubmission} from "./mission-schema.js";
import {PHASE2_EVENT} from "./phase2-event-config.js";
export async function submitPhase2Mission({missionId,answers,photoPaths}){
 if(PHASE2_EVENT.enabled!==true)throw Error("本次活動提交尚未開放");
 if(!auth?.currentUser?.isAnonymous)throw Error("請先以學生匿名身分登入");
 const group=await resumeGroup();
 if(group?.activityId!==PHASE2_EVENT.activityId || !PHASE2_EVENT.groups.includes(group?.groupId))
  throw Error("請使用本活動已核准的小組身分");
 validateSubmission(Number(missionId),answers,photoPaths);
 return (await httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPhase2Mission")({
  activityId:group.activityId,groupId:group.groupId,missionId:Number(missionId),answers,photoPaths
 })).data;
}
