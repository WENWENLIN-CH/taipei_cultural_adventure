// Fully isolated pilot2026: real Firestore and Storage emulators, trusted handler.
// Do not use production resources. No Firebase Hosting / rules deployment.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PROPOSED_ISOLATED_PILOT} from "../pilot-scope.js";
import {PHOTO_KEYS} from "../submission-core.js";

const projectId="demo-taipei-isolated-pilot";
for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"]){
 if(!process.env[key] || process.env[key].includes("://"))throw Error("Require local emulator "+key);
}
if(process.env.GCLOUD_PROJECT!==projectId)throw Error("Refusing non-isolated project");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"isolated-pilot");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const handler=createSubmissionHandler({
 db,bucket,
 emulatorPilotScope:PROPOSED_ISOLATED_PILOT,
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 makeError:(code,message)=>Object.assign(new Error(message),{code})
});
const jpg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const answers={
 1:{location:"臺北測試位置"},
 2:{lang1_lang:"韓文",lang2_lang:"泰文",lang3_lang:"越南文",lang4_lang:"英文"},
 3:{restaurant:"Halal 測試餐廳"},
 4:{c1_continent:"亞洲",c1_country:"泰國",c1_restaurant:"A",c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"B",c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"C"},
 5:{p1_country:"菲律賓",p1_name:"A",p2_country:"泰國",p2_name:"B",p3_country:"越南",p3_name:"C"}
};
const base=g=>`activities/pilot2026/groups/${g}`;
const data=(g,n,uid)=>({activityId:"pilot2026",groupId:g,missionId:n,
 answers:{...answers[n]},photoPaths:Object.fromEntries(PHOTO_KEYS[n].map(k=>[k,`${base(g)}/missions/${n}/${uid}/${k}.jpg`]))});
try{
 for(const g of PROPOSED_ISOLATED_PILOT.groups){
  await db.doc(base(g)).set({displayName:g});
  await db.doc(base(g)+"/members/"+g+"Student").set({studentCode:"TEST01"});
 }
 for(const g of PROPOSED_ISOLATED_PILOT.groups){
  for(const n of PROPOSED_ISOLATED_PILOT.missions){
   const payload=data(g,n,g+"Student");
   await test(`${g} 第${n}關：未上傳照片時無法完成`,async()=>{
    await assert.rejects(handler({uid:g+"Student",anonymous:true,data:payload}),{code:"failed-precondition"});
    assert.equal((await db.doc(base(g)+"/missions/"+n).get()).exists,false);
   });
   for(const path of Object.values(payload.photoPaths))
    await bucket.file(path).save(jpg,{resumable:false,contentType:"image/jpeg"});
   await test(`${g} 第${n}關：完整照片可建立雲端共同成果`,async()=>{
    const done=await handler({uid:g+"Student",anonymous:true,data:payload});
    assert.equal(done.status,"completed");
    const snap=await db.doc(base(g)+"/missions/"+n).get();
    assert.equal(snap.data().status,"completed");
    assert.deepEqual(snap.data().photoPaths,payload.photoPaths);
   });
   await test(`${g} 第${n}關：重複提交不能覆寫`,async()=>{
    await assert.rejects(handler({uid:g+"Student",anonymous:true,data:payload}),{code:"already-exists"});
   });
  }
 }
 await test("其他活動 ID 被拒絕，demo2026 成果也不被建立",async()=>{
  const invalid=data("group01",1,"group01Student");
  invalid.activityId="demo2026";
  await assert.rejects(handler({uid:"group01Student",anonymous:true,data:invalid}),{code:"permission-denied"});
  assert.equal((await db.doc("activities/demo2026/groups/group01/missions/1").get()).exists,false);
 });
 await test("其他組別被拒絕",async()=>{
  const wrong=data("group04",1,"group01Student");
  await assert.rejects(handler({uid:"group01Student",anonymous:true,data:wrong}),{code:"permission-denied"});
 });
 await test("不同小組的身分不能提交另一組的成果",async()=>{
  await assert.rejects(handler({uid:"group01Student",anonymous:true,data:data("group02",1,"group02Student")}),{code:"permission-denied"});
 });
 await test("三組五關皆完成，總共 39 張照片路徑",async()=>{
  let photoCount=0;
  for(const g of PROPOSED_ISOLATED_PILOT.groups){
   const docs=await Promise.all([1,2,3,4,5].map(n=>db.doc(base(g)+"/missions/"+n).get()));
   assert.equal(docs.filter(s=>s.data()?.status==="completed").length,5);
   photoCount+=docs.reduce((sum,s)=>sum+Object.keys(s.data().photoPaths).length,0);
  }
  assert.equal(photoCount,39);
 });
}finally{await deleteApp(app);}
