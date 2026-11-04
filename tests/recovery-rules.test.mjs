// Recovery candidate rules test. Never connects to live Firebase.
import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc,runTransaction,serverTimestamp,updateDoc} from "firebase/firestore";
import {ref,getMetadata,uploadBytes} from "firebase/storage";

const projectId="demo-taipei-recovery";
for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"]){
 if(!process.env[key] || process.env[key].includes("://"))throw Error("Recovery tests require both local emulators");
}
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-recovery-candidate.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-recovery-candidate.rules","utf8")}
});
const base="activities/pilot2026/groups/group02";
const token="b".repeat(48),bucket=`gs://${projectId}.firebasestorage.app`;
const photo=`${base}/missions/1/oldUid/photo1.jpg`;
const old=env.authenticatedContext("oldUid"),replacement=env.authenticatedContext("newUid");
const outsider=env.authenticatedContext("stranger");
const image=new Uint8Array([255,216,255,217]);
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,base),{displayName:"第二組"});
  await setDoc(doc(db,base+"/members/oldUid"),{studentCode:"S07",inviteId:"old",joinedAt:new Date()});
  await setDoc(doc(db,base+"/missions/1"),{status:"completed",submittedByUid:"oldUid"});
  await setDoc(doc(db,"invites/"+token),{activityId:"pilot2026",groupId:"group02",studentCode:"S07",claimedBy:null});
 });
 await test("原本組員未撤銷前可讀取自己的共同進度",async()=>{
  await assertSucceeds(getDoc(doc(old.firestore(),base+"/missions/1")));
  await assertSucceeds(uploadBytes(ref(old.storage(bucket),photo),image,{contentType:"image/jpeg"}));
 });
 await test("一般學生不可擅自更改 revoked 狀態",async()=>{
  await assertFails(updateDoc(doc(old.firestore(),base+"/members/oldUid"),{revoked:true}));
  await assertFails(setDoc(doc(outsider.firestore(),base+"/members/oldUid"),{revoked:true}));
 });
 // Simulated explicit teacher/admin approval, using rules-disabled SDK only.
 // No user-facing teacher tool exists yet; this does NOT mutate live records.
 await env.withSecurityRulesDisabled(async ctx=>{
  await updateDoc(doc(ctx.firestore(),base+"/members/oldUid"),{revoked:true});
 });
 await test("教師撤銷後舊匿名 UID 不能讀取小組任務",async()=>{
  await assertFails(getDoc(doc(old.firestore(),base+"/missions/1")));
  await assertFails(getDoc(doc(old.firestore(),base)));
 });
 await test("被撤銷者不能讀取或新增 Storage 照片",async()=>{
  await assertFails(getMetadata(ref(old.storage(bucket),photo)));
  await assertFails(uploadBytes(ref(old.storage(bucket),`${base}/missions/3/oldUid/photo1.jpg`),image,{contentType:"image/jpeg"}));
 });
 await test("新 UID 使用新的一次性邀請碼加入同一組",async()=>{
  await assertSucceeds(runTransaction(replacement.firestore(),async tx=>{
   const invitation=doc(replacement.firestore(),"invites/"+token);
   const snap=await tx.get(invitation);
   assert.equal(snap.data()?.claimedBy,null);
   tx.update(invitation,{claimedBy:"newUid",claimedAt:serverTimestamp()});
   tx.set(doc(replacement.firestore(),base+"/members/newUid"),{
    studentCode:"S07",inviteId:token,joinedAt:serverTimestamp()
   });
  }));
  const snap=await assertSucceeds(getDoc(doc(replacement.firestore(),base+"/missions/1")));
  assert.equal(snap.data().status,"completed");
 });
 await test("舊加入碼不可以被再次領取",async()=>{
  await assertFails(runTransaction(outsider.firestore(),async tx=>{
   const inviteRef=doc(outsider.firestore(),"invites/"+token);
   const snap=await tx.get(inviteRef);
   if(snap.data()?.claimedBy!==null)throw Error("已領取，不可重複使用");
   tx.update(inviteRef,{claimedBy:"stranger",claimedAt:serverTimestamp()});
  }));
 });
 await test("新 UID 可以讀取既有完成紀錄與原照片，但不能跨組",async()=>{
  await assertSucceeds(getMetadata(ref(replacement.storage(bucket),photo)));
  await assertFails(getDoc(doc(replacement.firestore(),"activities/pilot2026/groups/group01/missions/1")));
 });
 await test("撤銷舊 UID 不會刪除既有完成紀錄",async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
   const existing=await getDoc(doc(ctx.firestore(),base+"/missions/1"));
   assert.equal(existing.exists(),true);
   assert.equal(existing.data().submittedByUid,"oldUid");
  });
 });
}finally{await env.cleanup();}
