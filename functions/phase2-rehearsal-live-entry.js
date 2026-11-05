// Isolated on-line rehearsal only. NOT imported by legacy or Phase2 live indexes.
// Scope: taipei2026rehearsal / group01,group02,group03. Never targets taipei2026.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createPhase2JoinHandler} from "./phase2-join-handler.js";
import {createSubmissionHandler} from "./submission-handler.js";
const PROJECT="taipei-cultural-adventure";
const ACTIVITY="taipei2026rehearsal";
const GROUPS=["group01","group02","group03"];
if(!getApps().length)initializeApp();
const db=getFirestore(),bucket=getStorage().bucket(PROJECT+".firebasestorage.app");
const fail=(code,message)=>new HttpsError(code,message);
const runtimeOk=()=> (process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT)===PROJECT &&
 !process.env.FIRESTORE_EMULATOR_HOST&&!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const join=createPhase2JoinHandler({
 db,activityId:ACTIVITY,groupIds:GROUPS,
 serverTimestamp:()=>FieldValue.serverTimestamp(),makeError:fail
});
const submit=createSubmissionHandler({
 db,bucket,makeError:fail,serverTimestamp:()=>FieldValue.serverTimestamp(),
 approvedLiveScope:{activityId:ACTIVITY,groups:GROUPS,missions:[1,2,3,4,5]},
 transactionGuard:async({tx,db,input,base,makeError})=>{
  if(input.missionId===1)return;
  const prev=await tx.get(db.doc(base+"/missions/"+(input.missionId-1)));
  if(!prev.exists||prev.data()?.status!=="completed")
   throw makeError("failed-precondition","請先完成前一關");
 }
});
const actor=request=>({
 uid:request.auth?.uid,
 anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",
 data:request.data
});
export const joinPhase2RehearsalGroup=onCall({
 region:"asia-east1",maxInstances:2,memory:"256MiB"
},async request=>{
 if(!runtimeOk())throw fail("permission-denied","測試環境設定無效");
 return join(actor(request));
});
export const submitPhase2RehearsalMission=onCall({
 region:"asia-east1",maxInstances:2,memory:"256MiB",timeoutSeconds:60
},async request=>{
 if(!runtimeOk())throw fail("permission-denied","測試環境設定無效");
 return submit(actor(request));
});
