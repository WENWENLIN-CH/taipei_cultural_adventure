// Isolated candidate only. No Stage2 production callable has been deployed.
// The candidate preview keeps its submit gate OFF until server+Storage tests pass.
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {auth} from "./firebase-auth.js";
import {resumeGroup} from "./group-service.js";
import {validateSubmission} from "./mission-schema.js";
export async function submitPilot2026Stage2({missionId,answers,photoPaths}){
 if(!auth?.currentUser?.isAnonymous)throw Error("請先使用學生匿名身分登入");
 const group=await resumeGroup();
 if(group?.activityId!=="pilot2026" || group?.groupId!=="group01" || Number(missionId)!==2)
  throw Error("僅允許 pilot2026 第一組第二關的受控測試");
 validateSubmission(2,answers,photoPaths);
 return (await httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage2")({
  ...group,missionId:2,answers,photoPaths
 })).data;
}
