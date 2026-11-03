// End-to-end test: Auth Emulator token -> actual HTTPS callable emulator ->
// actual Storage object -> Firestore completion. Never run against production.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

const projectId="demo-taipei-callable";
const envs=["FIREBASE_AUTH_EMULATOR_HOST","FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FUNCTIONS_EMULATOR"];
for(const name of envs) if(!process.env[name]) throw Error(name+" missing; refusing any live calls");
for(const name of envs) if(/https?:\/\//.test(process.env[name])) throw Error("Emulator host must not include protocol");
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==projectId) throw Error("Unexpected project");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"callable-e2e");
const db=getFirestore(app);
const bucket=getStorage(app).bucket();
const base="activities/demo2026/groups/group01";
const mission=db.doc(base+"/missions/1");
const photoPath=base+"/missions/1/";
const validJPEG=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
async function newStudent(){
 const url="http://"+process.env.FIREBASE_AUTH_EMULATOR_HOST+"/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-test-key";
 const resp=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})});
 const data=await resp.json();
 if(!resp.ok||!data.idToken||!data.localId) throw Error("Anonymous auth emulator signup failed: "+JSON.stringify(data));
 return {uid:data.localId,token:data.idToken};
}
async function submit(token,payload){
 const url="http://127.0.0.1:5001/"+projectId+"/asia-east1/submitGroupMission";
 const resp=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({data:payload})});
 const body=await resp.json();
 return {status:resp.status,body};
}
const payload=(path)=>({activityId:"demo2026",groupId:"group01",missionId:1,answers:{location:"台北"},photoPaths:{photo1:path}});
let student,memberPath,other,otherPath;
try {
 student=await newStudent();
 other=await newStudent();
 memberPath=photoPath+student.uid+"/photo1.jpg";
 otherPath=photoPath+other.uid+"/photo1.jpg";
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/"+student.uid).set({studentCode:"S01"});
 await mission.delete();
 await test("已登入但不是組員不得提交",async()=>{
   const r=await submit(other.token,payload(memberPath));
   assert.equal(r.status,403); assert.equal((await mission.get()).exists,false);
 });
 await test("缺少照片時不得過關",async()=>{
   const r=await submit(student.token,payload(memberPath));
   assert.equal(r.status,400); assert.equal((await mission.get()).exists,false);
 });
 await test("真實 Storage JPEG 物件可以透過 HTTPS callable 建立成果",async()=>{
   await bucket.file(memberPath).save(validJPEG,{resumable:false,contentType:"image/jpeg"});
   const r=await submit(student.token,payload(memberPath));
   assert.equal(r.status,200,JSON.stringify(r.body));
   assert.equal(r.body.result?.status,"completed");
   const snap=await mission.get();
   assert.equal(snap.data().submittedByUid,student.uid);
   assert.equal(snap.data().submittedByCode,"S01");
   assert.ok(snap.data().submittedAt.toDate() instanceof Date);
 });
 await test("第二次提交不得覆蓋第一次成果",async()=>{
   const r=await submit(student.token,payload(memberPath));
   assert.equal(r.status,409,JSON.stringify(r.body));
   assert.equal((await mission.get()).data().submittedByUid,student.uid);
 });
 await test("另一名組員不能用同組別以外的照片路徑",async()=>{
   await mission.delete();
   const r=await submit(student.token,payload(memberPath.replace("group01","group02")));
   assert.equal(r.status,400);
   assert.equal((await mission.get()).exists,false);
 });
} finally {
 if(app)await deleteApp(app);
}
