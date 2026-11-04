// Second mission full server integration, strictly on local Firestore+Storage
// emulators. No production reads/writes, deploy, or live credential required.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PILOT2026_STAGE2} from "../pilot2026-stage2-authorization.js";

const projectId="demo-taipei-isolated-pilot";
if(process.env.GCLOUD_PROJECT!==projectId ||
 !process.env.FIRESTORE_EMULATOR_HOST ||
 !process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://") ||
 process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("://"))
 throw Error("Stage2 integration MUST run on isolated local Firebase emulators");

const app=initializeApp({
 projectId,storageBucket:projectId+".firebasestorage.app"
},"pilot2026-stage2-integration");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handle=createSubmissionHandler({
 db,bucket,emulatorPilotScope:PILOT2026_STAGE2,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const base="activities/pilot2026/groups/group01";
const keys=["lang1_photo","lang2_photo","lang3_photo","lang4_photo"];
const photoPath=(uid,key)=>`${base}/missions/2/${uid}/${key}.jpg`;
const photoPaths=Object.fromEntries(keys.map(k=>[k,photoPath("test02",k)]));
const answers={lang1_lang:"韓文",lang2_lang:"英文",lang3_lang:"泰文",lang4_lang:"越南文"};
const input=(patch={})=>({
 activityId:"pilot2026",groupId:"group01",missionId:2,
 answers:{...answers},photoPaths:{...photoPaths},...patch
});
const submit=(data=input(),uid="test02",anonymous=true)=>handle({uid,anonymous,data});
const validJpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const mission=db.doc(base+"/missions/2");
const first=db.doc(base+"/missions/1");
async function save(uid,key,bytes=validJpeg,mime="image/jpeg"){
 await bucket.file(photoPath(uid,key)).save(bytes,{resumable:false,contentType:mime});
}
try{
 await db.doc(base).set({displayName:"第一組",pilot:true});
 await db.doc(base+"/members/test01").set({studentCode:"TEST01"});
 await db.doc(base+"/members/test02").set({studentCode:"TEST02"});
 await db.doc("activities/pilot2026/groups/group02/members/other").set({studentCode:"OTHER"});
 await first.set({status:"completed",answers:{location:"第一關已驗收"},photoPaths:{photo1:"immutable-photo"},submittedByCode:"TEST01"});
 const firstBefore=(await first.get()).data();

 await test("Stage2 denies anonymous-off, nonmember, wrong group and other missions",async()=>{
  await assert.rejects(submit(input(),"test02",false),{code:"unauthenticated"});
  await assert.rejects(submit(input(),"other"),{code:"permission-denied"});
  await assert.rejects(submit(input({groupId:"group02"})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:1})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:3})),{code:"permission-denied"});
  await assert.rejects(submit(input({activityId:"demo2026"})),{code:"permission-denied"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Missing any one of four photos prevents completion",async()=>{
  for(const k of keys.slice(0,3))await save("test02",k);
  await assert.rejects(submit(),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage2 rejects invalid language duplicate and forged photo path",async()=>{
  await assert.rejects(submit(input({answers:{...answers,lang4_lang:"韓文"}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,lang4_photo:photoPath("test02","lang3_photo")}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,lang4_photo:photoPaths.lang4_photo.replace("/group01/","/group02/")}})),{code:"invalid-argument"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage2 rejects non-JPEG contents even when MIME claims image/jpeg",async()=>{
  await save("test02","lang4_photo",Buffer.from([0,1,2,3]),"image/jpeg");
  await assert.rejects(submit(),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage2 rejects wrong MIME and missing eligible uploader",async()=>{
  await save("test02","lang4_photo",validJpeg,"image/png");
  await assert.rejects(submit(),{code:"failed-precondition"});
  // Every photo uploader UID is verified against member documents.
  const forged={...photoPaths,lang4_photo:photoPath("unknown","lang4_photo")};
  await assert.rejects(submit(input({photoPaths:forged})),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("All four validated JPEG objects create exactly one shared Stage2 result",async()=>{
  await save("test02","lang4_photo");
  const done=await submit();
  assert.deepEqual(done,{missionId:2,status:"completed"});
  const record=(await mission.get()).data();
  assert.equal(record.status,"completed");
  assert.equal(record.submittedByUid,"test02");
  assert.equal(record.submittedByCode,"TEST02");
  assert.deepEqual(record.answers,answers);
  assert.deepEqual(record.photoPaths,photoPaths);
  assert.ok(record.submittedAt.toDate() instanceof Date);
 });
 await test("Second member cannot overwrite completed Stage2; Stage1 stays intact",async()=>{
  await assert.rejects(submit(input(),"test01"),{code:"already-exists"});
  assert.deepEqual((await first.get()).data(),firstBefore);
  assert.equal((await mission.get()).data().submittedByCode,"TEST02");
  for(const n of [3,4,5])assert.equal((await db.doc(base+"/missions/"+n).get()).exists,false);
 });
}finally{await deleteApp(app);}
