import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,setDoc,getDoc,updateDoc,collection,getDocs} from "firebase/firestore";
import {ref,uploadBytes,getMetadata,getBytes} from "firebase/storage";
const project="demo-taipei-rehearsal-rules";
if(process.env.GCLOUD_PROJECT!==project||
 !process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Only local rehearsal rules Emulator supported");
const env=await initializeTestEnvironment({
 projectId:project,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync(".phase2-live-rules-backup/rehearsal-firestore.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync(".phase2-live-rules-backup/rehearsal-storage.rules","utf8")}
});
const base="activities/taipei2026rehearsal/groups/";
const auth=uid=>env.authenticatedContext(uid);
const p=(group,tail)=>base+group+"/"+tail;
const png=path=>ref(auth("testA").storage("gs://"+project+".firebasestorage.app"),path);
const jpeg=new Uint8Array([255,216,255,217]);
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  for(const g of ["group01","group02","group03"])
   await setDoc(doc(ctx.firestore(),base+g),{joinTokenHash:"a".repeat(64),phase2:true,maxMembers:7,memberCount:1});
  await setDoc(doc(ctx.firestore(),p("group01","members/testA")),{studentCode:"G1-S01",revoked:false});
  await setDoc(doc(ctx.firestore(),p("group01","members/testC")),{studentCode:"G1-S03",revoked:false});
  await setDoc(doc(ctx.firestore(),p("group02","members/testB")),{studentCode:"G2-S01",revoked:false});
  await setDoc(doc(ctx.firestore(),p("group01","members/revoked")),{studentCode:"G1-S02",revoked:true});
  await setDoc(doc(ctx.firestore(),p("group01","missions/1")),{status:"completed"});
  await setDoc(doc(ctx.firestore(),"teacherAccess/teacher"),{authorized:true});
  await setDoc(doc(ctx.firestore(),"activities/taipei2026/groups/group01/members/official"),{studentCode:"G1-S01"});
  await setDoc(doc(ctx.firestore(),"activities/taipei2026/groups/group01/missions/1"),{status:"completed"});
 });
 await test("Rehearsal member reads own completed mission",async()=>{
  await assertSucceeds(getDoc(doc(auth("testA").firestore(),p("group01","missions/1"))));
 });
 await test("Rehearsal member cannot read private QR group document or list groups",async()=>{
  await assertFails(getDoc(doc(auth("testA").firestore(),base+"group01")));
  await assertFails(getDocs(collection(auth("testA").firestore(),"activities/taipei2026rehearsal/groups")));
 });
 await test("Outsider and revoked UID cannot access rehearsal results",async()=>{
  await assertFails(getDoc(doc(auth("testB").firestore(),p("group01","missions/1"))));
  await assertFails(getDoc(doc(auth("revoked").firestore(),p("group01","missions/1"))));
 });
 await test("Rehearsal client cannot create member or tamper mission",async()=>{
  await assertFails(setDoc(doc(auth("outsider").firestore(),p("group01","members/outsider")),{studentCode:"X"}));
  await assertFails(updateDoc(doc(auth("testA").firestore(),p("group01","missions/1")),{status:"pending"}));
 });
 await test("Rehearsal JPEG upload allowed for own UID only",async()=>{
  const photo=p("group01","missions/1/testA/photo1.jpg");
  await assertSucceeds(uploadBytes(png(photo),jpeg,{contentType:"image/jpeg"}));
  await assertSucceeds(getMetadata(png(photo)));
  const sameGroup=ref(auth("testC").storage("gs://"+project+".firebasestorage.app"),photo);
  await assertSucceeds(getBytes(sameGroup));
  const outsider=ref(auth("testB").storage("gs://"+project+".firebasestorage.app"),photo);
  await assertFails(getBytes(outsider));
  await assertFails(uploadBytes(png(photo),jpeg,{contentType:"image/jpeg"}));
 });
 await test("Rehearsal JPEG cross-group and revoked upload rejected",async()=>{
  await assertFails(uploadBytes(png(p("group02","missions/1/testA/photo1.jpg")),jpeg,{contentType:"image/jpeg"}));
  const banned=ref(auth("revoked").storage("gs://"+project+".firebasestorage.app"),p("group01","missions/1/revoked/photo1.jpg"));
  await assertFails(uploadBytes(banned,jpeg,{contentType:"image/jpeg"}));
 });
 await test("Teacher may view rehearsal group and official group unaffected",async()=>{
  await assertSucceeds(getDoc(doc(auth("teacher").firestore(),base+"group01")));
  await assertSucceeds(getDoc(doc(auth("official").firestore(),"activities/taipei2026/groups/group01/missions/1")));
  await assertFails(getDoc(doc(auth("testA").firestore(),"activities/taipei2026/groups/group01/missions/1")));
 });
}finally{await env.cleanup();}
