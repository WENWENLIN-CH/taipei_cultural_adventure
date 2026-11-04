// NOT EXPORTED FROM functions/index.js and NOT DEPLOYED.
// Standalone candidate callable for a separately reviewed rollout.
// The existing submitGroupMission keeps its current demo2026 mission3 policy.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";
import {PILOT2026_STAGE1,allowCandidateSubmission} from "./pilot2026-authorization.js";

if(!getApps().length)initializeApp();
const project=process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
const handler=createSubmissionHandler({
 db:getFirestore(),
 bucket:getStorage().bucket("taipei-cultural-adventure.firebasestorage.app"),
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>new HttpsError(code,message),
 approvedLiveScope:PILOT2026_STAGE1
});
export const submitPilot2026Stage1=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:1,timeoutSeconds:60
},request=>{
 if(project!=="taipei-cultural-adventure" || !allowCandidateSubmission({stage:"stage1",data:request.data}))
  throw new HttpsError("permission-denied","未授權的試辦活動或關卡");
 return handler({
  uid:request.auth?.uid,
  anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",
  data:request.data
 });
});
