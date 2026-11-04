import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PILOT2026_STAGE1} from "../pilot2026-authorization.js";
const projectId="demo-taipei-isolated-pilot";
if(process.env.GCLOUD_PROJECT!==projectId || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Unsafe execution: isolated Firebase emulators required");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"candidate-stage1");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handler=createSubmissionHandler({
 db,bucket,emulatorPilotScope:PILOT2026_STAGE1,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const base="activities/pilot2026/groups/group01";
const photo=`${base}/missions/1/testUid/photo1.jpg`;
const input=(activityId,groupId,missionId,photoPath=photo)=>({
 activityId,groupId,missionId,
 answers:missionId===1?{location:"星月測試地點"}:{restaurant:"餐廳測試"},
 photoPaths:missionId===1?{photo1:photoPath}:{photo1:photoPath,photo2:photoPath}
});
try{
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/testUid").set({studentCode:"S01"});
 await test("candidate denies other groups and non-stage1 missions before Storage reads",async()=>{
  await assert.rejects(handler({uid:"testUid",anonymous:true,data:input("pilot2026","group02",1)}),{code:"permission-denied"});
  await assert.rejects(handler({uid:"testUid",anonymous:true,data:input("pilot2026","group01",3)}),{code:"permission-denied"});
  await assert.rejects(handler({uid:"testUid",anonymous:true,data:input("demo2026","group01",1)}),{code:"permission-denied"});
 });
 await test("candidate refuses a missing photo in allowed stage1 scope",async()=>{
  await assert.rejects(handler({uid:"testUid",anonymous:true,data:input("pilot2026","group01",1)}),{code:"failed-precondition"});
 });
 await bucket.file(photo).save(Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]),{resumable:false,contentType:"image/jpeg"});
 await test("candidate accepts exactly one eligible photo and creates one completed document",async()=>{
  const outcome=await handler({uid:"testUid",anonymous:true,data:input("pilot2026","group01",1)});
  assert.equal(outcome.status,"completed");
  const snap=await db.doc(base+"/missions/1").get();
  assert.equal(snap.data().status,"completed");
  assert.equal(snap.data().submittedByCode,"S01");
 });
 await test("stage1 submission cannot be overwritten",async()=>{
  await assert.rejects(handler({uid:"testUid",anonymous:true,data:input("pilot2026","group01",1)}),{code:"already-exists"});
 });
}finally{await deleteApp(app);}
