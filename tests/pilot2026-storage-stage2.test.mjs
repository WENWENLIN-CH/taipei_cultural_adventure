import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,setDoc} from "firebase/firestore";
import {ref,uploadBytes,getMetadata,deleteObject} from "firebase/storage";

if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Storage stage2 tests MUST run under emulators");
const projectId="demo-taipei-pilot-stage2-rules";
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-group-draft.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-pilot2026-stage2-candidate.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const jpg=new Uint8Array([255,216,255,217]);
const pilot=(group,mission,uid,filename)=>
 `activities/pilot2026/groups/${group}/missions/${mission}/${uid}/${filename}`;
const p1=env.authenticatedContext("stage2Member");
const p2=env.authenticatedContext("outsider");
const other=env.authenticatedContext("group02Member");
const demo=env.authenticatedContext("demoMember");
const storage=p1.storage(bucket);
const file=(path,ctx=p1)=>ref(ctx.storage(bucket),path);
const jpeg={contentType:"image/jpeg"};
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,"activities/pilot2026/groups/group01/members/stage2Member"),{studentCode:"TEST02"});
  await setDoc(doc(db,"activities/pilot2026/groups/group02/members/group02Member"),{studentCode:"TEST03"});
  await setDoc(doc(db,"activities/demo2026/groups/group01/members/demoMember"),{studentCode:"S02"});
  await setDoc(doc(db,"activities/pilot2026/groups/group01/missions/1"),{status:"completed"});
 });
 await test("stage2 permits exactly four JPEG filenames for enrolled group01 UID",async()=>{
  for(let i=1;i<=4;i++){
   const obj=file(pilot("group01","2","stage2Member",`lang${i}_photo.jpg`));
   await assertSucceeds(uploadBytes(obj,jpg,jpeg));
   await assertSucceeds(getMetadata(obj));
  }
 });
 await test("stage2 existing photo slot cannot overwrite or delete",async()=>{
  const obj=file(pilot("group01","2","stage2Member","lang1_photo.jpg"));
  await assertFails(uploadBytes(obj,jpg,jpeg));
  await assertFails(deleteObject(obj));
 });
 await test("stage2 rejects unauthorized photo names and incorrect image type",async()=>{
  await assertFails(uploadBytes(file(pilot("group01","2","stage2Member","photo1.jpg")),jpg,jpeg));
  await assertFails(uploadBytes(file(pilot("group01","2","stage2Member","lang5_photo.jpg")),jpg,jpeg));
  await assertFails(uploadBytes(file(pilot("group01","2","stage2Member","lang1_photo.png")),jpg,{contentType:"image/png"}));
  await assertFails(uploadBytes(file(pilot("group01","2","stage2Member","lang2_photo.jpg")),jpg,{contentType:"image/png"}));
 });
 await test("stage2 rejects missing membership, wrong group, and impersonated UID",async()=>{
  await assertFails(uploadBytes(file(pilot("group01","2","outsider","lang1_photo.jpg"),p2),jpg,jpeg));
  await assertFails(uploadBytes(file(pilot("group02","2","group02Member","lang1_photo.jpg"),other),jpg,jpeg));
  await assertFails(uploadBytes(file(pilot("group01","2","outsider","lang2_photo.jpg")),jpg,jpeg));
 });
 await test("pilot2026 missions3-5 remain locked",async()=>{
  for(const mission of ["3","4","5"]){
   await assertFails(uploadBytes(file(pilot("group01",mission,"stage2Member","photo1.jpg")),jpg,jpeg));
  }
 });
 await test("pilot2026 first-stage scope still permits JPEG without overwriting completion",async()=>{
  const obj=file(pilot("group01","1","stage2Member","photo1.jpg"));
  await assertSucceeds(uploadBytes(obj,jpg,jpeg));
  await assertFails(uploadBytes(obj,jpg,jpeg));
 });
 await test("demo2026 legacy scope remains available",async()=>{
  const obj=file("activities/demo2026/groups/group01/missions/3/demoMember/photo1.jpg",demo);
  await assertSucceeds(uploadBytes(obj,jpg,jpeg));
  await assertSucceeds(getMetadata(obj));
 });
 await test("nonmembers cannot read stage2 photos",()=>assertFails(
  getMetadata(file(pilot("group01","2","stage2Member","lang1_photo.jpg"),p2))
 ));
 await test("oversized stage2 files are rejected",async()=>{
  const big=new Uint8Array(1024*1024+1);big.set([255,216,255]);
  await assertFails(uploadBytes(file(pilot("group01","2","stage2Member","lang5_photo.jpg")),big,jpeg));
  // Test with fresh approved key on independent UID, to isolate size rather than filename.
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/members/bigMember"),{studentCode:"BIG"});
  });
  const bigCtx=env.authenticatedContext("bigMember");
  await assertFails(uploadBytes(file(pilot("group01","2","bigMember","lang1_photo.jpg"),bigCtx),big,jpeg));
 });
}finally{await env.cleanup();}
