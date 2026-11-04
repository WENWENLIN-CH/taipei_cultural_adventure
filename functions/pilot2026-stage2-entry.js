// Standalone Stage2 callable CANDIDATE; NOT referenced by deployed index.js.
// Requires explicit deployment review before it can be used.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";
import {PILOT2026_STAGE2,allowStage2Candidate} from "./pilot2026-stage2-authorization.js";
if(!getApps().length)initializeApp();
const project=process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
const handler=createSubmissionHandler({
 db:getFirestore(),
 bucket:getStorage().bucket("taipei-cultural-adventure.firebasestorage.app"),
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>new HttpsError(code,message),
 approvedLiveScope:PILOT2026_STAGE2
});
export const submitPilot2026Stage2=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:1,timeoutSeconds:60
},request=>{
 if(project!=="taipei-cultural-adventure" || !allowStage2Candidate(request.data))
  throw new HttpsError("permission-denied","第二關試辦權限不符");
 return handler({
  uid:request.auth?.uid,
  anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",
  data:request.data
 });
});
