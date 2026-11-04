import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,setDoc,getDoc} from "firebase/firestore";
import {ref,uploadBytes,getMetadata} from "firebase/storage";
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Local Firestore/Storage emulators required; never run against production");
const projectId="demo-taipei-phase2";
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-group-draft.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-phase2-rehearsal-emulator.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const jpeg=new Uint8Array([255,216,255,217]),meta={contentType:"image/jpeg"};
const groups=["group01","group02","group03"];
const ids=groups.flatMap(group=>[1,2].map(i=>({group,uid:group+"-student0"+i})));
const auth=id=>env.authenticatedContext(id.uid);
const base=(activity,group)=>`activities/${activity}/groups/${group}`;
const photo=(activity,group,uid,mission=1,file="photo1.jpg")=>`${base(activity,group)}/missions/${mission}/${uid}/${file}`;
const file=(uid,path)=>ref(env.authenticatedContext(uid).storage(bucket),path);
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  for(const group of groups){
   await setDoc(doc(ctx.firestore(),base("phase2sandbox",group)),{displayName:group});
  }
  for(const id of ids){
   await setDoc(doc(ctx.firestore(),base("phase2sandbox",id.group)+"/members/"+id.uid),{studentCode:id.uid});
  }
  await setDoc(doc(ctx.firestore(),base("pilot2026","group01")), {displayName:"preserved pilot"});
  await setDoc(doc(ctx.firestore(),base("pilot2026","group01")+"/members/pilot-test"),{studentCode:"TEST02"});
  await setDoc(doc(ctx.firestore(),base("pilot2026","group01")+"/missions/1"),{status:"completed",answers:{location:"preserved"}});
  for(const group of groups)
   await setDoc(doc(ctx.firestore(),base("phase2sandbox",group)+"/missions/1"),{status:group==="group01"?"completed":"pending"});
 });
 await test("Six distinct students can read own group progress and member record",async()=>{
  for(const {group,uid} of ids){
   const ctx=env.authenticatedContext(uid);
   await assertSucceeds(getDoc(doc(ctx.firestore(),base("phase2sandbox",group)+"/missions/1")));
   await assertSucceeds(getDoc(doc(ctx.firestore(),base("phase2sandbox",group)+"/members/"+uid)));
  }
 });
 await test("Each of six students can upload only own group's JPEG immutable slot",async()=>{
  for(const {group,uid} of ids){
   const path=photo("phase2sandbox",group,uid);
   await assertSucceeds(uploadBytes(file(uid,path),jpeg,meta));
   await assertSucceeds(getMetadata(file(uid,path)));
   await assertFails(uploadBytes(file(uid,path),jpeg,meta));
  }
 });
 await test("Cross-group reads and writes cannot use membership or copied paths",async()=>{
  for(const {group,uid} of ids){
   const other=groups.find(g=>g!==group);
   const ctx=env.authenticatedContext(uid);
   await assertFails(getDoc(doc(ctx.firestore(),base("phase2sandbox",other)+"/missions/1")));
   await assertFails(uploadBytes(file(uid,photo("phase2sandbox",other,uid)),jpeg,meta));
   const otherUid=ids.find(x=>x.group===other).uid;
   await assertFails(getMetadata(file(uid,photo("phase2sandbox",other,otherUid))));
   await assertFails(uploadBytes(file(uid,photo("phase2sandbox",group,otherUid)),jpeg,meta));
  }
 });
 await test("Students cannot create or tamper with mission completions in Firestore",async()=>{
  const {group,uid}=ids[0];
  await assertFails(setDoc(doc(auth(ids[0]).firestore(),base("phase2sandbox",group)+"/missions/2"),{status:"completed"}));
  await assertFails(setDoc(doc(auth(ids[0]).firestore(),base("phase2sandbox",group)+"/missions/1"),{status:"completed"}));
 });
 await test("Rehearsal UID cannot read or upload into pilot2026",async()=>{
  const {uid}=ids[0];
  await assertFails(getDoc(doc(auth(ids[0]).firestore(),base("pilot2026","group01")+"/missions/1")));
  await assertFails(uploadBytes(file(uid,photo("pilot2026","group01",uid)),jpeg,meta));
 });
 await test("Pilot2026 existing authorized group01 member retains read and upload rights",async()=>{
  const ctx=env.authenticatedContext("pilot-test");
  const docPath=base("pilot2026","group01")+"/missions/1";
  const snap=await assertSucceeds(getDoc(doc(ctx.firestore(),docPath)));
  assert.equal(snap.data().answers.location,"preserved");
  await assertSucceeds(uploadBytes(file("pilot-test",photo("pilot2026","group01","pilot-test")),jpeg,meta));
  await assertFails(uploadBytes(file("pilot-test",photo("pilot2026","group02","pilot-test")),jpeg,meta));
 });
}finally{await env.cleanup();}
