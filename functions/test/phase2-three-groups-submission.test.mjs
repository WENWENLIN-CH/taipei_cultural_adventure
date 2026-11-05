// Phase2 server-side three-group submission rehearsal.
// ONLY local Firestore + Storage emulators; no production cloud function exports.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "../submission-handler.js";
import {PHOTO_KEYS} from "../submission-core.js";
import {PHASE2_REHEARSAL} from "../../phase2-rehearsal-manifest.js";
const projectId="demo-taipei-isolated-pilot"; // required by existing emulator-only guard
if(process.env.GCLOUD_PROJECT!==projectId ||
 !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://") ||
 process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("://"))
 throw Error("Phase2 integration requires local Firebase emulators and demo project");
const app=initializeApp({projectId,storageBucket:projectId+".firebasestorage.app"},"phase2-multigroup-submission");
const db=getFirestore(app),bucket=getStorage(app).bucket();
const scope={activityId:PHASE2_REHEARSAL.activityId,groups:[...PHASE2_REHEARSAL.groups],missions:[...PHASE2_REHEARSAL.missions]};
const makeError=(code,message)=>Object.assign(new Error(message),{code});
const submit=createSubmissionHandler({
 db,bucket,emulatorPilotScope:scope,
 serverTimestamp:()=>FieldValue.serverTimestamp(),makeError
});
const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,255,217]);
const base=g=>`activities/${scope.activityId}/groups/${g}`;
const answers={
 1:{location:"文化標誌測試地點"},
 2:{lang1_lang:"韓文",lang2_lang:"泰文",lang3_lang:"英文",lang4_lang:"越南文"},
 3:{restaurant:"Halal 測試餐廳"},
 4:{c1_continent:"亞洲",c1_country:"泰國",c1_restaurant:"餐廳A",c2_continent:"歐洲",c2_country:"法國",c2_restaurant:"餐廳B",c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"餐廳C"},
 5:{p1_country:"泰國",p1_name:"零食A",p2_country:"越南",p2_name:"零食B",p3_country:"菲律賓",p3_name:"零食C"}
};
const payload=(group,mission,uid)=>({
 activityId:scope.activityId,groupId:group,missionId:mission,
 answers:{...answers[mission]},
 photoPaths:Object.fromEntries(PHOTO_KEYS[mission].map(k=>[k,`${base(group)}/missions/${mission}/${uid}/${k}.jpg`]))
});
const ready=async p=>{
 for(const path of Object.values(p.photoPaths))
  await bucket.file(path).save(jpeg,{resumable:false,contentType:"image/jpeg"});
};
const completed=async group=>{
 const s=await Promise.all([1,2,3,4,5].map(n=>db.doc(`${base(group)}/missions/${n}`).get()));
 return s.filter(x=>x.exists&&x.data().status==="completed").length;
};
const groupIds=PHASE2_REHEARSAL.groups;
const people=Object.fromEntries(groupIds.map(g=>[g,[g+"-student01",g+"-student02"]]));
try{
 await test("Seed only isolated Phase2 sandbox with three groups, two members each",async()=>{
  for(const g of groupIds){
   await db.doc(base(g)).create({displayName:g});
   for(const uid of people[g])
    await db.doc(`${base(g)}/members/${uid}`).create({studentCode:uid});
   assert.equal(await completed(g),0);
  }
 });
 await test("Unauthorized cross-group submit and pilot activity submit both rejected",async()=>{
  const foreign=payload("group02",1,people.group01[0]);
  await assert.rejects(submit({uid:people.group01[0],anonymous:true,data:foreign}),{code:"permission-denied"});
  await assert.rejects(submit({uid:people.group01[0],anonymous:false,data:payload("group01",1,people.group01[0])}),{code:"unauthenticated"});
  await assert.rejects(submit({uid:people.group01[0],anonymous:true,data:{...payload("group01",1,people.group01[0]),activityId:"pilot2026"}}),{code:"permission-denied"});
 });
 await test("Group01 can finish first mission only with uploaded JPEG",async()=>{
  const p=payload("group01",1,people.group01[0]);
  await assert.rejects(submit({uid:people.group01[0],anonymous:true,data:p}),{code:"failed-precondition"});
  await ready(p);
  assert.deepEqual(await submit({uid:people.group01[0],anonymous:true,data:p}),{missionId:1,status:"completed"});
  assert.equal(await completed("group01"),1);
  assert.equal(await completed("group02"),0);
  await assert.rejects(submit({uid:people.group01[1],anonymous:true,data:p}),{code:"already-exists"});
 });
 await test("Same-group second member can finish another mission, first member observes shared completion",async()=>{
  const p=payload("group01",2,people.group01[1]);
  await ready(p);
  assert.deepEqual(await submit({uid:people.group01[1],anonymous:true,data:p}),{missionId:2,status:"completed"});
  const snap=await db.doc(`${base("group01")}/missions/2`).get();
  assert.equal(snap.data().submittedByUid,people.group01[1]);
  assert.equal(await completed("group01"),2);
  assert.equal(await completed("group03"),0);
 });
 await test("Three groups independently complete all five quests without leaking other groups' progress",async()=>{
  for(const g of groupIds){
   for(let n=1;n<=5;n++){
    if(g==="group01"&&n<=2)continue;
    const uid=people[g][n%2];
    const p=payload(g,n,uid);
    await ready(p);
    assert.deepEqual(await submit({uid,anonymous:true,data:p}),{missionId:n,status:"completed"});
    assert.equal((await db.doc(`${base(g)}/missions/${n}`).get()).data().submittedByUid,uid);
   }
   assert.equal(await completed(g),5);
  }
  for(const g of groupIds){
   // Mission 5 was submitted by student02 (5 % 2 = 1); retry with that same uploaded photo path.
   const originalSubmitter=people[g][5%2];
   await assert.rejects(submit({uid:originalSubmitter,anonymous:true,data:payload(g,5,originalSubmitter)}),{code:"already-exists"});
  }
 });
 await test("Sandbox completion never creates or modifies pilot2026 missions",async()=>{
  const snap=await db.doc("activities/pilot2026/groups/group01/missions/5").get();
  assert.equal(snap.exists,false);
  for(const g of groupIds)assert.equal(await completed(g),5);
 });
}finally{await deleteApp(app);}
