// Stage4 end-to-end verification on isolated local Firestore and Storage emulators ONLY.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PILOT2026_STAGE4} from "../pilot2026-stage4-authorization.js";
const projectId="demo-taipei-isolated-pilot";
if(process.env.GCLOUD_PROJECT!==projectId||
 !process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://")||
 process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("://"))
 throw Error("Stage4 integration MUST run on isolated local emulators");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"stage4-integration");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handler=createSubmissionHandler({
 db,bucket,emulatorPilotScope:PILOT2026_STAGE4,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const base="activities/pilot2026/groups/group01";
const keys=["c1_photo","c2_photo","c3_photo"];
const path=(uid,k)=>base+"/missions/4/"+uid+"/"+k+".jpg";
const photoPaths=Object.fromEntries(keys.map(k=>[k,path("test02",k)]));
const answers={
 c1_continent:"亞洲",c1_country:"日本",c1_restaurant:"日式餐廳",
 c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"義大利餐廳",
 c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"摩洛哥餐廳"
};
const input=(override={})=>({
 activityId:"pilot2026",groupId:"group01",missionId:4,
 answers:{...answers},photoPaths:{...photoPaths},...override
});
const submit=(data=input(),uid="test02",anonymous=true)=>handler({uid,anonymous,data});
const jpg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const save=(key,bytes=jpg,mime="image/jpeg")=>bucket.file(photoPaths[key]).save(bytes,{resumable:false,contentType:mime});
const mission=db.doc(base+"/missions/4");
try{
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/test01").set({studentCode:"TEST01"});
 await db.doc(base+"/members/test02").set({studentCode:"TEST02"});
 await db.doc("activities/pilot2026/groups/group02/members/outsider").set({studentCode:"OUT"});
 for(let i=1;i<=3;i++)await db.doc(base+"/missions/"+i).set({
  status:"completed",answers:{marker:"original"+i},photoPaths:{photo1:"existing"+i},submittedByCode:i===1?"TEST01":"TEST02"
 });
 const before=await Promise.all([1,2,3].map(i=>db.doc(base+"/missions/"+i).get()));
 await test("Stage4 rejects unauthenticated, nonmember, other group and different mission IDs",async()=>{
  await assert.rejects(submit(input(),"test02",false),{code:"unauthenticated"});
  await assert.rejects(submit(input(),"outsider"),{code:"permission-denied"});
  await assert.rejects(submit(input({groupId:"group02"})),{code:"permission-denied"});
  await assert.rejects(submit(input({activityId:"demo2026"})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:1,answers:{location:"foo"},photoPaths:{photo1:base+"/missions/1/test02/photo1.jpg"}})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:3,answers:{restaurant:"bar"},photoPaths:{photo1:base+"/missions/3/test02/photo1.jpg",photo2:base+"/missions/3/test02/photo2.jpg"}})),{code:"permission-denied"});
  await assert.rejects(submit(input({missionId:5,answers:Object.fromEntries([1,2,3].flatMap(i=>[[`p${i}_country`,String(i)],[`p${i}_name`,"snack"]])),photoPaths:Object.fromEntries([1,2,3].map(i=>[`p${i}_photo`,base+`/missions/5/test02/p${i}_photo.jpg`]))})),{code:"permission-denied"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Stage4 rejects repeated continents, missing restaurant and incorrect photo count",async()=>{
  await assert.rejects(submit(input({answers:{...answers,c3_continent:"亞洲"}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({answers:{...answers,c2_restaurant:""}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{c1_photo:photoPaths.c1_photo,c2_photo:photoPaths.c2_photo}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,extra:photoPaths.c1_photo}})),{code:"invalid-argument"});
  await assert.rejects(submit(input({photoPaths:{...photoPaths,c1_photo:photoPaths.c1_photo.replace("/group01/","/group02/")}})),{code:"invalid-argument"});
 });
 await test("Missing any of three actual JPEG objects prevents Stage4 completion",async()=>{
  await assert.rejects(submit(),{code:"failed-precondition"});
  await save("c1_photo");
  await save("c2_photo");
  await assert.rejects(submit(),{code:"failed-precondition"});
  assert.equal((await mission.get()).exists,false);
 });
 await test("Fake JPEG content and incorrect MIME are denied",async()=>{
  await save("c3_photo",Buffer.from([0,1,2,3]),"image/jpeg");
  await assert.rejects(submit(),{code:"failed-precondition"});
  await save("c3_photo",jpg,"image/png");
  await assert.rejects(submit(),{code:"failed-precondition"});
 });
 await test("Three validated JPEGs create exactly one completed fourth mission",async()=>{
  await save("c3_photo");
  assert.deepEqual(await submit(),{missionId:4,status:"completed"});
  const saved=(await mission.get()).data();
  assert.equal(saved.status,"completed");
  assert.equal(saved.submittedByUid,"test02");
  assert.equal(saved.submittedByCode,"TEST02");
  assert.deepEqual(saved.answers,answers);
  assert.deepEqual(saved.photoPaths,photoPaths);
  assert.ok(saved.submittedAt.toDate() instanceof Date);
 });
 await test("Second student cannot overwrite; three previous results untouched and fifth stays closed",async()=>{
  await assert.rejects(submit(input(),"test01"),{code:"already-exists"});
  for(let n=1;n<=3;n++){
   const snap=await db.doc(base+"/missions/"+n).get();
   assert.deepEqual(snap.data(),before[n-1].data());
  }
  assert.equal((await db.doc(base+"/missions/5").get()).exists,false);
 });
}finally{await deleteApp(app);}
