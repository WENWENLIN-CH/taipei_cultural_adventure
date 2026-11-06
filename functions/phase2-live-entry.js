// Independent Phase2 callable candidate. NOT imported by functions/index.js.
// Explicit activity and group allowlists are required at deployment time.
// Do not enable against pilot2026, demo2026, or phase2sandbox.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";
import {createPhase2JoinHandler} from "./phase2-join-handler.js";

if(!getApps().length)initializeApp();
const project=process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||"";
const activityId=(process.env.PHASE2_ACTIVITY_ID||"").trim();
const groupIds=(process.env.PHASE2_GROUP_IDS||"").split(",").map(s=>s.trim()).filter(Boolean);
const forbidden=new Set(["demo2026","pilot2026","phase2sandbox"]);
const validId=s=>/^[a-zA-Z0-9_-]{1,60}$/.test(s);
const enabled=project==="taipei-cultural-adventure" &&
 validId(activityId) && !forbidden.has(activityId) &&
 groupIds.length>0 && groupIds.length<=30 &&
 groupIds.every(validId) && new Set(groupIds).size===groupIds.length;
const scope={activityId,groups:groupIds,missions:[1,2,3,4,5]};
const db=getFirestore();
const handler=createSubmissionHandler({
 db,
 bucket:getStorage().bucket("taipei-cultural-adventure.firebasestorage.app"),
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>new HttpsError(code,message),
 approvedLiveScope:scope
 // Free-order missions: each mission is independently submittable.
 // submission-handler still checks membership, uploads, and atomic no-duplicate writes.
});
export const submitPhase2Mission=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:3,timeoutSeconds:60
},async request=>{
 if(!enabled)throw new HttpsError("permission-denied","第二階段活動尚未啟用");
 if(!request.auth?.uid||request.auth?.token.firebase?.sign_in_provider!=="anonymous")
  throw new HttpsError("unauthenticated","請先使用學生匿名身分登入");
 return handler({uid:request.auth.uid,anonymous:true,data:request.data});
});


// QR enrollment uses the same independently reviewed allowlist as submission.
const joinHandler=enabled ? createPhase2JoinHandler({
 db,activityId,groupIds,serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>new HttpsError(code,message)
}) : null;
export const joinPhase2Group=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:3,timeoutSeconds:30
},async request=>{
 if(!enabled)throw new HttpsError("permission-denied","第二階段活動尚未啟用");
 return joinHandler({
  uid:request.auth?.uid,
  anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",
  data:request.data
 });
});
