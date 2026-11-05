// Genuine Auth -> HTTPS Callable -> Firestore/Storage emulator only.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {qrDigest} from "../phase2-join-handler.js";
const project="demo-taipei-isolated-pilot";
for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST"])
 if(!process.env[key])throw Error("Missing required local emulator: "+key);
if(process.env.GCLOUD_PROJECT!==project)throw Error("Wrong emulator project");
const app=initializeApp({projectId:project,storageBucket:project+".firebasestorage.app"},"phase2-callable-http-test");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const group="group01",code="a".repeat(48),base="activities/phase2sandbox/groups/"+group;
const url=name=>"http://127.0.0.1:5001/"+project+"/asia-east1/"+name;
async function student(){
 const endpoint="http://"+process.env.FIREBASE_AUTH_EMULATOR_HOST+"/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key";
 const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({returnSecureToken:true})});
 const body=await response.json();
 if(!response.ok||!body.idToken)throw Error("Auth emulator signup failed");
 return {uid:body.localId,token:body.idToken};
}
async function call(name,user,data){
 const response=await fetch(url(name),{method:"POST",headers:{
  "content-type":"application/json",...(user?{authorization:"Bearer "+user.token}:{})
 },body:JSON.stringify({data})});
 return {status:response.status,body:await response.json()};
}
const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
try{
 await db.doc(base).create({phase2:true,maxMembers:7,memberCount:0,joinTokenHash:qrDigest(code)});
 const a=await student(),b=await student();
 await test("Actual HTTPS Callable admits anonymous user by reusable group QR",async()=>{
  const r=await call("joinPhase2Group",a,{groupId:group,code});
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.result.studentCode,"G1-S01");
  assert.equal((await db.doc(base).get()).data().memberCount,1);
 });
 await test("Repeated authenticated QR scan retains identity and count",async()=>{
  const r=await call("joinPhase2Group",a,{groupId:group,code});
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.result.restored,true);
  assert.equal((await db.doc(base).get()).data().memberCount,1);
 });
 await test("Wrong QR and unauthenticated request rejected over HTTP",async()=>{
  assert.equal((await call("joinPhase2Group",b,{groupId:group,code:"b".repeat(48)})).status,403);
  assert.notEqual((await call("joinPhase2Group",null,{groupId:group,code})).status,200);
 });
 await test("A member submits a real JPEG through HTTPS Callable",async()=>{
  const photoPath=base+"/missions/1/"+a.uid+"/photo1.jpg";
  await bucket.file(photoPath).save(jpeg,{resumable:false,contentType:"image/jpeg"});
  const data={activityId:"phase2sandbox",groupId:group,missionId:1,
   answers:{location:"台北測試"},photoPaths:{photo1:photoPath}};
  const outsider=await call("submitPhase2Mission",b,data);
  assert.equal(outsider.status,403,JSON.stringify(outsider.body));
  const r=await call("submitPhase2Mission",a,data);
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.result.status,"completed");
  assert.equal((await db.doc(base+"/missions/1").get()).data().submittedByUid,a.uid);
  const duplicate=await call("submitPhase2Mission",a,data);
  assert.equal(duplicate.status,409,JSON.stringify(duplicate.body));
 });
 await test("No pilot2026 online or emulator mission touched",async()=>{
  assert.equal((await db.doc("activities/pilot2026/groups/group01/missions/1").get()).exists,false);
 });
}finally{await deleteApp(app);}
