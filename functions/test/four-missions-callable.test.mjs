// Test only. Runs exclusively with all four Firebase emulators.
// Extends prior mission-1 callable test to missions 1,2,4,5 without live writes.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {PHOTO_KEYS} from "../submission-core.js";

const projectId="demo-taipei-callable";
for (const name of ["FIREBASE_AUTH_EMULATOR_HOST","FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FIREBASE_EMULATOR_HUB"]) {
 if (!process.env[name] || /https?:\/\//.test(process.env[name])) throw Error("Emulator-only test: invalid or missing "+name);
}
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==projectId) throw Error("Refusing live project");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"four-quest-callable");
const db=getFirestore(app);
const bucket=getStorage(app).bucket();
const base="activities/demo2026/groups/group01";
const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const answers={
 1:{location:"臺北車站附近"},
 2:{lang1_lang:"韓文",lang2_lang:"泰文",lang3_lang:"越南文",lang4_lang:"英文"},
 4:{c1_continent:"亞洲",c1_country:"臺灣",c1_restaurant:"亞洲餐廳",c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"歐洲餐廳",c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"非洲餐廳"},
 5:{p1_country:"泰國",p1_name:"商品A",p2_country:"越南",p2_name:"商品B",p3_country:"菲律賓",p3_name:"商品C"}
};
async function student(){
 const url="http://"+process.env.FIREBASE_AUTH_EMULATOR_HOST+"/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key";
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})});
 const body=await response.json();
 assert.ok(response.ok && body.idToken && body.localId,"Emulated anonymous sign-in failed");
 return {uid:body.localId,token:body.idToken};
}
async function call(token,data){
 const url="http://127.0.0.1:5001/"+projectId+"/asia-east1/submitGroupMission";
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({data})});
 return {code:response.status,body:await response.json()};
}
function dataFor(n,uid){
 return {activityId:"demo2026",groupId:"group01",missionId:n,answers:{...answers[n]},photoPaths:Object.fromEntries(PHOTO_KEYS[n].map(key=>[key,`${base}/missions/${n}/${uid}/${key}.jpg`]))};
}
let alice,bob,outsider;
try{
 alice=await student();bob=await student();outsider=await student();
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/"+alice.uid).set({studentCode:"S01"});
 await db.doc(base+"/members/"+bob.uid).set({studentCode:"S02"});
 for(const n of [1,2,4,5]){
  const mission=db.doc(`${base}/missions/${n}`);
  await mission.delete();
  const valid=dataFor(n,alice.uid);
  await test(`第 ${n} 關：缺少照片不得建立完成紀錄`,async()=>{
   const r=await call(alice.token,valid);
   assert.equal(r.code,400,JSON.stringify(r.body));
   assert.equal((await mission.get()).exists,false);
  });
  await test(`第 ${n} 關：其他組／未加入學生不可提交`,async()=>{
   const r=await call(outsider.token,valid);
   assert.equal(r.code,403,JSON.stringify(r.body));
   assert.equal((await mission.get()).exists,false);
  });
  for(const path of Object.values(valid.photoPaths)){
   await bucket.file(path).save(jpeg,{resumable:false,contentType:"image/jpeg"});
  }
  await test(`第 ${n} 關：實際全部照片與答案可合法提交`,async()=>{
   const r=await call(alice.token,valid);
   assert.equal(r.code,200,JSON.stringify(r.body));
   assert.equal(r.body.result?.status,"completed");
   const saved=(await mission.get()).data();
   assert.equal(saved.status,"completed");
   assert.equal(saved.submittedByUid,alice.uid);
   assert.equal(saved.submittedByCode,"S01");
   assert.deepEqual(saved.photoPaths,valid.photoPaths);
   assert.deepEqual(saved.answers,valid.answers);
   assert.ok(saved.submittedAt.toDate() instanceof Date);
  });
  await test(`第 ${n} 關：同組第二位組員無法覆寫成果`,async()=>{
   const r=await call(bob.token,valid);
   assert.equal(r.code,409,JSON.stringify(r.body));
   assert.equal((await mission.get()).data().submittedByUid,alice.uid);
  });
  // Clear the emulator-only completion so invalid payload tests prove no write.
  await mission.delete();
  const invalid=dataFor(n,alice.uid);
  if(n===1) invalid.answers.location=" ";
  if(n===2) invalid.answers.lang4_lang=invalid.answers.lang1_lang;
  if(n===4) invalid.answers.c3_continent=invalid.answers.c1_continent;
  if(n===5) invalid.answers.p3_country=invalid.answers.p1_country;
  await test(`第 ${n} 關：必要文字／唯一性限制遭到拒絕`,async()=>{
   const r=await call(alice.token,invalid);
   assert.equal(r.code,400,JSON.stringify(r.body));
   assert.equal((await mission.get()).exists,false);
  });
  await test(`第 ${n} 關：不同關卡的照片路徑不可混用`,async()=>{
   const wrong=dataFor(n,alice.uid);
   const key=PHOTO_KEYS[n][0];
   wrong.photoPaths[key]=wrong.photoPaths[key].replace(`/missions/${n}/`,`/missions/3/`);
   const r=await call(alice.token,wrong);
   assert.equal(r.code,400,JSON.stringify(r.body));
   assert.equal((await mission.get()).exists,false);
  });
 }
}finally{
 await deleteApp(app);
}
