// Stage5 isolated client CANDIDATE. No live student page imports this.
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {auth} from "./firebase-auth.js";
import {resumeGroup} from "./group-service.js";
import {validateSubmission} from "./mission-schema.js";
export async function submitPilot2026Stage5({missionId,answers,photoPaths}){
 if(!auth?.currentUser?.isAnonymous)throw Error("請先使用學生匿名身分登入");
 const group=await resumeGroup();
 if(group?.activityId!=="pilot2026"||group?.groupId!=="group01"||Number(missionId)!==5)
  throw Error("僅允許 pilot2026 第一組第五關受控測試");
 validateSubmission(5,answers,photoPaths);
 return (await httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage5")({
  ...group,missionId:5,answers,photoPaths
 })).data;
}
