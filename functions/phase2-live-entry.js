// Independent Phase2 callable candidate. NOT imported by functions/index.js.
// Explicit activity and group allowlists are required at deployment time.
// Do not enable against pilot2026, demo2026, or phase2sandbox.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";

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
 approvedLiveScope:scope,
 // The immediately preceding mission is checked inside the write transaction.
 transactionGuard:async({tx,db,input,base,makeError})=>{
  if(input.missionId===1)return;
  const previous=await tx.get(db.doc(`${base}/missions/${input.missionId-1}`));
  if(!previous.exists||previous.data()?.status!=="completed")
   throw makeError("failed-precondition","請先完成上一關");
 }
});
export const submitPhase2Mission=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:3,timeoutSeconds:60
},async request=>{
 if(!enabled)throw new HttpsError("permission-denied","第二階段活動尚未啟用");
 if(!request.auth?.uid||request.auth?.token.firebase?.sign_in_provider!=="anonymous")
  throw new HttpsError("unauthenticated","請先使用學生匿名身分登入");
 return handler({uid:request.auth.uid,anonymous:true,data:request.data});
});


// One reusable private QR credential per group. Only a hash is stored in Firestore.
// The group membership transaction reserves 7 total anonymous UID slots.
import {createHash,timingSafeEqual} from "node:crypto";
const digest=s=>createHash("sha256").update(s,"utf8").digest("hex");
export const joinPhase2Group=onCall({
 region:"asia-east1",memory:"256MiB",maxInstances:3,timeoutSeconds:30
},async request=>{
 if(!enabled)throw new HttpsError("permission-denied","第二階段活動尚未啟用");
 const uid=request.auth?.uid;
 if(!uid || request.auth?.token.firebase?.sign_in_provider!=="anonymous")
  throw new HttpsError("unauthenticated","請先使用學生匿名身分登入");
 const groupId=request.data?.groupId,code=request.data?.code;
 if(!groupIds.includes(groupId)||typeof code!=="string"||!/^[a-f0-9]{48}$/.test(code))
  throw new HttpsError("invalid-argument","小組 QR Code 無效");
 return db.runTransaction(async tx=>{
  const groupRef=db.doc(`activities/${activityId}/groups/${groupId}`);
  const memberRef=groupRef.collection("members").doc(uid);
  const allMemberRefs=groupIds.map(g=>db.doc(`activities/${activityId}/groups/${g}/members/${uid}`));
  // All reads before writes, including membership in other groups.
  const [groupSnap,...members]=await Promise.all([
   tx.get(groupRef),...allMemberRefs.map(r=>tx.get(r))
  ]);
  const g=groupSnap.data()||{};
  const expected=typeof g.joinTokenHash==="string"&&/^[a-f0-9]{64}$/.test(g.joinTokenHash)
   ?Buffer.from(g.joinTokenHash,"hex"):Buffer.alloc(32);
  const actual=Buffer.from(digest(code),"hex");
  if(!groupSnap.exists||g.phase2!==true||g.maxMembers!==7||
   !timingSafeEqual(expected,actual))
   throw new HttpsError("permission-denied","這張小組 QR Code 無效或已停用");
  const other=members.some((m,i)=>groupIds[i]!==groupId && m.exists);
  if(other)throw new HttpsError("permission-denied","此手機已加入另一組");
  const current=members[groupIds.indexOf(groupId)];
  if(current?.exists){
   if(current.data()?.revoked===true)throw new HttpsError("permission-denied","組員身分已停用");
   return {activityId,groupId,studentCode:current.data().studentCode,restored:true};
  }
  const count=g.memberCount;
  if(!Number.isInteger(count)||count<0||count>=7)
   throw new HttpsError("resource-exhausted","本組 7 個名額已滿，請洽老師");
  const studentCode=`G${groupIds.indexOf(groupId)+1}-S${String(count+1).padStart(2,"0")}`;
  tx.create(memberRef,{studentCode,joinedAt:FieldValue.serverTimestamp(),revoked:false});
  tx.update(groupRef,{memberCount:count+1});
  return {activityId,groupId,studentCode,restored:false};
 });
});
