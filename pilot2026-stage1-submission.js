// Client candidate ONLY; the pilot2026-cloud-bootstrap.js still disables submissions.
// Uses a distinct callable so demo2026 submitGroupMission is never broadened.
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {auth} from "./firebase-auth.js";
import {resumeGroup} from "./group-service.js";
import {validateSubmission} from "./mission-schema.js";
export async function submitPilot2026Stage1({missionId,answers,photoPaths}){
 if(!auth?.currentUser?.isAnonymous)throw Error("請先使用試辦學生匿名身分登入");
 const group=await resumeGroup();
 if(group?.activityId!=="pilot2026" || group?.groupId!=="group01" || Number(missionId)!==1)
  throw Error("只開放 pilot2026 第一組第一關受控測試");
 validateSubmission(missionId,answers,photoPaths);
 const callable=httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage1");
 const {data}=await callable({...group,missionId:1,answers,photoPaths});
 // Cloud progress is authoritative; this response is not an unlock token.
 return data;
}
