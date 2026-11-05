// Firestore Emulator integration: reusable QR, seven places, single-UID restore.
// Explicit demo-only gate: never create or read production data.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {createPhase2JoinHandler,qrDigest} from "../phase2-join-handler.js";
const projectId="demo-taipei-phase2-qr";
if(process.env.GCLOUD_PROJECT!==projectId||
 !process.env.FIRESTORE_EMULATOR_HOST||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://"))
 throw Error("Phase2 QR test ONLY supports Firestore emulator and exact demo project");
const app=initializeApp({projectId},"phase2-qr-integration");
const db=getFirestore(app);
const activityId="phase2sandbox",groups=["group01","group02","group03"];
const tokens=groups.map((g,i)=>String(i+1).repeat(48));
const makeError=(code,message)=>Object.assign(new Error(message),{code});
const join=createPhase2JoinHandler({
 db,activityId,groupIds:groups,
 serverTimestamp:()=>FieldValue.serverTimestamp(),makeError
});
const path=g=>`activities/${activityId}/groups/${g}`;
const call=(uid,g,code)=>join({uid,anonymous:true,data:{groupId:g,code}});
try{
 await test("Seed three reusable QR groups in isolated emulator",async()=>{
  for(let i=0;i<groups.length;i++)
   await db.doc(path(groups[i])).create({
    displayName:groups[i],phase2:true,maxMembers:7,memberCount:0,
    joinTokenHash:qrDigest(tokens[i])
   });
 });
 await test("7 independent UIDs join each of 3 groups using same QR credential",async()=>{
  for(let i=0;i<groups.length;i++){
   for(let n=1;n<=7;n++){
    const uid=`uid-${i+1}-${n}`;
    const result=await call(uid,groups[i],tokens[i]);
    assert.equal(result.studentCode,`G${i+1}-S${String(n).padStart(2,"0")}`);
    assert.equal(result.restored,false);
   }
   assert.equal((await db.doc(path(groups[i])).get()).data().memberCount,7);
  }
 });
 await test("8th new student denied, existing UID reuses QR without consuming another slot",async()=>{
  for(let i=0;i<groups.length;i++){
   await assert.rejects(call(`new-uid-${i}`,groups[i],tokens[i]),{code:"resource-exhausted"});
   const again=await call(`uid-${i+1}-1`,groups[i],tokens[i]);
   assert.equal(again.restored,true);
   assert.equal((await db.doc(path(groups[i])).get()).data().memberCount,7);
  }
 });
 await test("Cross-group QR cannot transfer existing enrolled student",async()=>{
  await assert.rejects(call("uid-1-1","group02",tokens[1]),{code:"permission-denied"});
 });
 await test("Incorrect group QR, unknown group, unauthenticated all rejected",async()=>{
  await assert.rejects(call("uid-1-1","group01",tokens[1]),{code:"permission-denied"});
  await assert.rejects(call("uid-stranger","group04",tokens[0]),{code:"invalid-argument"});
  await assert.rejects(join({uid:null,anonymous:false,data:{groupId:"group01",code:tokens[0]}}),{code:"unauthenticated"});
 });
 await test("Revoked member cannot restore or rejoin",async()=>{
  const member=db.doc(path("group01")+"/members/uid-1-1");
  await member.update({revoked:true});
  try{await assert.rejects(call("uid-1-1","group01",tokens[0]),{code:"permission-denied"});}
  finally{await member.update({revoked:false});}
 });
 await test("No pilot2026 or demo2026 records created by QR flow",async()=>{
  for(const activity of ["pilot2026","demo2026"])
   assert.equal((await db.doc(`activities/${activity}/groups/group01`).get()).exists,false);
 });
}finally{await deleteApp(app);}
