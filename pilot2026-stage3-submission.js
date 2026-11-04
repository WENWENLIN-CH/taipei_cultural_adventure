// Independent third mission client candidate; no live page enables this yet.
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {auth} from "./firebase-auth.js";
import {resumeGroup} from "./group-service.js";
import {validateSubmission} from "./mission-schema.js";
export async function submitPilot2026Stage3({missionId,answers,photoPaths}){
 if(!auth?.currentUser?.isAnonymous)throw Error("請先以學生匿名身分登入");
 const group=await resumeGroup();
 if(group?.activityId!=="pilot2026"||group?.groupId!=="group01"||Number(missionId)!==3)
  throw Error("僅允許 pilot2026 第一組第三關測試");
 validateSubmission(3,answers,photoPaths);
 return (await httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage3")({
  ...group,missionId:3,answers,photoPaths
 })).data;
}
