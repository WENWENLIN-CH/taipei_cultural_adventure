// DEVELOPMENT ONLY. A client must never directly mark a group mission completed.
// The trusted callable function validates group membership and cloud photo objects.
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { auth } from "./firebase-auth.js";
import { resumeGroup } from "./group-service.js";
import { validateSubmission } from "./mission-schema.js";

export async function submitGroupMission({missionId,answers,photoPaths}) {
  if(!auth?.currentUser?.isAnonymous) throw new Error("請先以學生身分登入");
  const group=await resumeGroup();
  if(!group) throw new Error("請先加入小組");
  validateSubmission(missionId,answers,photoPaths);
  const fn=httpsCallable(getFunctions(auth.app,"asia-east1"),"submitGroupMission");
  const {data}=await fn({...group,missionId:Number(missionId),answers,photoPaths});
  // Only the server can create completed mission documents. Do not trust this
  // response to unlock group progress; the shared Firestore listener is canonical.
  return data;
}
