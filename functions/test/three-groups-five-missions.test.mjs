// Isolated three-group, five-mission full integration test.
// All write operations target local Firebase Emulators under demo project ID.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {PHOTO_KEYS} from "../submission-core.js";

const projectId="demo-taipei-callable";
for(const key of ["FIREBASE_AUTH_EMULATOR_HOST","FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FIREBASE_EMULATOR_HUB"]){
 if(!process.env[key]||process.env[key].includes("://"))throw Error("Emulator required: "+key);
}
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==projectId)throw Error("Unexpected project; refusing test");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"three-groups-full-quest");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,16,74,70,73,70,0,1,0,0,0xff,0xd9]);
const answers={
 1:{location:"星月標誌測試位置"},
 2:{lang1_lang:"韓文",lang2_lang:"英文",lang3_lang:"泰文",lang4_lang:"越南文"},
 3:{restaurant:"Halal 測試餐廳"},
 4:{c1_continent:"亞洲",c1_country:"泰國",c1_restaurant:"餐廳A",c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"餐廳B",c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"餐廳C"},
 5:{p1_country:"菲律賓",p1_name:"零食A",p2_country:"泰國",p2_name:"零食B",p3_country:"越南",p3_name:"零食C"}
};
async function enrollEmulatorStudent(){
 const url="http://"+process.env.FIREBASE_AUTH_EMULATOR_HOST+"/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key";
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})});
 const j=await r.json();
 assert.ok(r.ok&&j.idToken&&j.localId,"Emulator Auth required");
 return {uid:j.localId,token:j.idToken};
}
async function callable(token,data){
 const url="http://127.0.0.1:5001/"+projectId+"/asia-east1/submitGroupMission";
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({data})});
 return {code:r.status,response:await r.json()};
}
function groupBase(groupId){return `activities/demo2026/groups/${groupId}`;}
function payload(groupId,n,uid){
 const base=groupBase(groupId);
 return {activityId:"demo2026",groupId,missionId:n,answers:{...answers[n]},
 photoPaths:Object.fromEntries(PHOTO_KEYS[n].map(k=>[k,`${base}/missions/${n}/${uid}/${k}.jpg`]))};
}
try{
 const students={};
 for(const id of ["group01","group02","group03"]){
  const student=await enrollEmulatorStudent();
  students[id]=student;
  const base=groupBase(id);
  await db.doc(base).set({displayName:id});
  await db.doc(base+"/members/"+student.uid).set({studentCode:"S01"});
 }
 for(const [groupId,student] of Object.entries(students)){
  const base=groupBase(groupId);
  await test(`${groupId}：第一關前最後謎題不可解鎖`,async()=>{
   const docs=await Promise.all([1,2,3,4,5].map(n=>db.doc(`${base}/missions/${n}`).get()));
   assert.equal(docs.filter(d=>d.data()?.status==="completed").length,0);
  });
  for(let n=1;n<=5;n++){
   const data=payload(groupId,n,student.uid);
   await test(`${groupId} 第${n}關：缺照片不得完成`,async()=>{
    const r=await callable(student.token,data);
    assert.equal(r.code,400,JSON.stringify(r.response));
    assert.equal((await db.doc(`${base}/missions/${n}`).get()).exists,false);
   });
   for(const path of Object.values(data.photoPaths))
    await bucket.file(path).save(jpeg,{resumable:false,contentType:"image/jpeg"});
   await test(`${groupId} 第${n}關：實際 JPEG 可建立一份成果`,async()=>{
    const r=await callable(student.token,data);
    assert.equal(r.code,200,JSON.stringify(r.response));
    const record=(await db.doc(`${base}/missions/${n}`).get()).data();
    assert.equal(record.status,"completed");
    assert.equal(record.submittedByUid,student.uid);
    assert.equal(Object.keys(record.photoPaths).length,PHOTO_KEYS[n].length);
   });
   await test(`${groupId} 第${n}關：不可重複覆寫`,async()=>{
    const r=await callable(student.token,data);
    assert.equal(r.code,409,JSON.stringify(r.response));
   });
  }
  await test(`${groupId}：完整五關同步狀態解鎖條件成立`,async()=>{
   const docs=await Promise.all([1,2,3,4,5].map(n=>db.doc(`${base}/missions/${n}`).get()));
   assert.equal(docs.filter(d=>d.data()?.status==="completed").length,5);
  });
 }
 await test("三組相同任務彼此獨立，跨組不能冒用照片",async()=>{
  const first=students.group01,second=students.group02;
  const attempted=payload("group02",4,first.uid);
  const r=await callable(first.token,attempted);
  assert.equal(r.code,403,JSON.stringify(r.response));
  const a=(await db.doc(groupBase("group01")+"/missions/4").get()).data();
  const b=(await db.doc(groupBase("group02")+"/missions/4").get()).data();
  assert.equal(a.submittedByUid,first.uid);
  assert.equal(b.submittedByUid,second.uid);
 });
 await test("三組每組剛好五份成果、合計 39 張照片路徑",async()=>{
  let paths=0;
  for(const groupId of Object.keys(students)){
   const docs=await Promise.all([1,2,3,4,5].map(n=>db.doc(`${groupBase(groupId)}/missions/${n}`).get()));
   assert.equal(docs.filter(s=>s.exists).length,5);
   paths+=docs.reduce((sum,s)=>sum+Object.keys(s.data().photoPaths).length,0);
  }
  assert.equal(paths,39);
 });
}finally{await deleteApp(app);}
