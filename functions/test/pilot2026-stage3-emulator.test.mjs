// Third mission end-to-end handler integration; local emulators only.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PILOT2026_STAGE3} from "../pilot2026-stage3-authorization.js";
const projectId="demo-taipei-isolated-pilot";
if(process.env.GCLOUD_PROJECT!==projectId||
 !process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://")||
 process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("://"))
 throw Error("Stage3 tests require isolated Firestore and Storage emulators");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"stage3-test");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handler=createSubmissionHandler({
 db,bucket,emulatorPilotScope:PILOT2026_STAGE3,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const base="activities/pilot2026/groups/group01";
const paths={
 photo1:base+"/missions/3/test02/photo1.jpg",
 photo2:base+"/missions/3/test02/photo2.jpg"
};
const input=(change={})=>({activityId:"pilot2026",groupId:"group01",
 missionId:3,answers:{restaurant:"測試清真餐廳"},photoPaths:{...paths},...change});
const submit=(data=input(),uid="test02",anonymous=true)=>handler({uid,anonymous,data});
const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const mission=db.doc(base+"/missions/3");
try{
 await db.doc(base).set({displayName:"第一組"});
 for(const uid of ["test01","test02"])await db.doc(base+"/members/"+uid).set({studentCode:uid.toUpperCase()});
 await db.doc("activities/pilot2026/groups/group02/members/outsider").set({studentCode:"OUT"});
 await db.doc(base+"/missions/1").set({status:"completed",answers:{location:"原第一關"},photoPaths:{photo1:"existing1"}});
 await db.doc(base+"/missions/2").set({status:"completed",answers:{lang1_lang:"英文"},photoPaths:{photo1:"existing2"}});
 const before=await Promise.all([1,2].map(n=>db.doc(base+"/missions/"+n).get()));
 await test("Stage3 refuses unauthenticated, nonmember, another group and valid other missions",async()=>{
  await assert.rejects(submit(input(),"test02",false),{code:"unauthenticated"});
  await assert.rejects(submit(input(),"outsider"),{code:"permission-denied"});
  await assert.rejects(submit(input({groupId:"group02"})),{code:"permission-denied"});
  await assert.rejects(submit(input({activityId:"demo2026"})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:1,answers:{location:"測試"},photoPaths:{photo1:base+"/missions/1/test02/photo1.jpg"}})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:2,answers:{lang1_lang:"韓文",lang2_lang:"英文",lang3_lang:"泰文",lang4_lang:"越南文"},photoPaths:Object.fromEntries([1,2,3,4].map(i=>[`lang${i}_photo`,base+`/missions/2/test02/lang${i}_photo.jpg`]))})),{code:"permission-denied"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage3 requires a restaurant and exactly two photo fields",async()=>{
  await assert.rejects(submit(input({answers:{restaurant:""}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{photo1:paths.photo1}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...paths,extra:paths.photo1}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...paths,photo2:paths.photo2.replace("/group01/","/group02/")}})),{code:"invalid-argument"});
 });
 await test("Missing both or either of two stored images prevents completion",async()=>{
  await assert.rejects(submit(),{code:"failed-precondition"});
  await bucket.file(paths.photo1).save(jpeg,{resumable:false,contentType:"image/jpeg"});
  await assert.rejects(submit(),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Reject fake image content and wrong MIME",async()=>{
  await bucket.file(paths.photo2).save(Buffer.from([0,1,2,3]),{resumable:false,contentType:"image/jpeg"});
  await assert.rejects(submit(),{code:"failed-precondition"});
  await bucket.file(paths.photo2).save(jpeg,{resumable:false,contentType:"image/png"});
  await assert.rejects(submit(),{code:"failed-precondition"});
 });
 await test("Two valid JPEG objects create one shared completed record",async()=>{
  await bucket.file(paths.photo2).save(jpeg,{resumable:false,contentType:"image/jpeg"});
  const result=await submit();
  assert.deepEqual(result,{missionId:3,status:"completed"});
  const saved=(await mission.get()).data();
  assert.equal(saved.status,"completed");
  assert.equal(saved.submittedByCode,"TEST02");
  assert.equal(saved.answers.restaurant,"測試清真餐廳");
  assert.deepEqual(saved.photoPaths,paths);
  assert.ok(saved.submittedAt.toDate() instanceof Date);
 });
 await test("Duplicate submission denied and original 2/5 documents remain unchanged",async()=>{
  await assert.rejects(submit(input(),"test01"),{code:"already-exists"});
  for(let n=1;n<=2;n++){
   const after=await db.doc(base+"/missions/"+n).get();
   assert.deepEqual(after.data(),before[n-1].data());
  }
  for(const n of [4,5])assert.equal((await db.doc(base+"/missions/"+n).get()).exists,false);
 });
}finally{await deleteApp(app);}
