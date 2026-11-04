// Fifth mission server behavior is tested exclusively against local emulators.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PILOT2026_STAGE5} from "../pilot2026-stage5-authorization.js";
const projectId="demo-taipei-isolated-pilot";
if(process.env.GCLOUD_PROJECT!==projectId||
 !process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://")||
 process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("://"))
 throw Error("Stage5 integration MUST run on isolated local emulators");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"stage5-integration");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handler=createSubmissionHandler({
 db,bucket,emulatorPilotScope:PILOT2026_STAGE5,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const base="activities/pilot2026/groups/group01";
const keys=["p1_photo","p2_photo","p3_photo"];
const path=(uid,k)=>base+"/missions/5/"+uid+"/"+k+".jpg";
const photoPaths=Object.fromEntries(keys.map(k=>[k,path("test02",k)]));
const answers={
 p1_country:"菲律賓",p1_name:"測試零食1",
 p2_country:"印尼",p2_name:"測試零食2",
 p3_country:"越南",p3_name:"測試零食3"
};
const input=(override={})=>({
 activityId:"pilot2026",groupId:"group01",missionId:5,
 answers:{...answers},photoPaths:{...photoPaths},...override
});
const submit=(data=input(),uid="test02",anonymous=true)=>handler({uid,anonymous,data});
const jpg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const save=(key,bytes=jpg,mime="image/jpeg")=>bucket.file(photoPaths[key]).save(bytes,{resumable:false,contentType:mime});
const mission=db.doc(base+"/missions/5");
try{
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/test01").set({studentCode:"TEST01"});
 await db.doc(base+"/members/test02").set({studentCode:"TEST02"});
 await db.doc("activities/pilot2026/groups/group02/members/outsider").set({studentCode:"OUT"});
 for(let i=1;i<=4;i++)await db.doc(base+"/missions/"+i).set({
  status:"completed",answers:{marker:"previous"+i},photoPaths:{photo1:"existing"+i},submittedByCode:i===1?"TEST01":"TEST02"
 });
 const previous=await Promise.all([1,2,3,4].map(i=>db.doc(base+"/missions/"+i).get()));
 const count=async()=>{const s=await Promise.all([1,2,3,4,5].map(n=>db.doc(base+"/missions/"+n).get()));return s.filter(x=>x.exists && x.data().status==="completed").length;};
 await test("Before Stage5 submission 4/5 is incomplete and final puzzle must stay locked",async()=>{
  assert.equal(await count(),4);
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage5 rejects unauthenticated and unauthorized scopes",async()=>{
  await assert.rejects(submit(input(),"test02",false),{code:"unauthenticated"});
  await assert.rejects(submit(input(),"outsider"),{code:"permission-denied"});
  await assert.rejects(submit(input({groupId:"group02"})),{code:"permission-denied"});
  await assert.rejects(submit(input({activityId:"demo2026"})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:4,answers:{
   c1_continent:"亞洲",c1_country:"日本",c1_restaurant:"a",
   c2_continent:"歐洲",c2_country:"法國",c2_restaurant:"b",
   c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"c"
  },photoPaths:Object.fromEntries([1,2,3].map(i=>[`c${i}_photo`,base+`/missions/4/test02/c${i}_photo.jpg`]))})),{code:"permission-denied"});
 });
 await test("Stage5 requires distinct countries, three product names, and exactly three photos",async()=>{
  await assert.rejects(submit(input({answers:{...answers,p3_country:"菲律賓"}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({answers:{...answers,p2_name:""}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{p1_photo:photoPaths.p1_photo,p2_photo:photoPaths.p2_photo}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,extra:photoPaths.p1_photo}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,p1_photo:photoPaths.p1_photo.replace("/group01/","/group02/")}})),{code:"invalid-argument"});
 });
 await test("Missing any Stage5 cloud photo prevents shared completion",async()=>{
  await assert.rejects(submit(),{code:"failed-precondition"});
  await save("p1_photo");
  await save("p2_photo");
  await assert.rejects(submit(),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Non-JPEG bytes or MIME are rejected",async()=>{
  await save("p3_photo",Buffer.from([0,1,2,3]),"image/jpeg");
  await assert.rejects(submit(),{code:"failed-precondition"});
  await save("p3_photo",jpg,"image/png");
  await assert.rejects(submit(),{code:"failed-precondition"});
 });
 await test("Three valid Stage5 photos create fifth record and 5/5 completion",async()=>{
  await save("p3_photo");
  assert.deepEqual(await submit(),{missionId:5,status:"completed"});
  const saved=(await mission.get()).data();
  assert.equal(saved.status,"completed");
  assert.equal(saved.submittedByCode,"TEST02");
  assert.deepEqual(saved.answers,answers);
  assert.deepEqual(saved.photoPaths,photoPaths);
  assert.ok(saved.submittedAt.toDate() instanceof Date);
  assert.equal(await count(),5);
 });
 await test("Duplicate Stage5 rejected; existing Stage1-4 documents remain unchanged",async()=>{
  await assert.rejects(submit(input(),"test01"),{code:"already-exists"});
  for(let n=1;n<=4;n++){
   const snap=await db.doc(base+"/missions/"+n).get();
   assert.deepEqual(snap.data(),previous[n-1].data());
  }
 });
}finally{await deleteApp(app);}
