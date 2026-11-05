// Local Emulator tests only, never read/modify real Firebase.
// Covers private QR hash, revoked membership, cross-group photos, teacher access.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc,updateDoc,collection,getDocs} from "firebase/firestore";
import {ref,uploadBytes,getMetadata,deleteObject} from "firebase/storage";
const projectId="demo-taipei-phase2-live-rules";
if(process.env.GCLOUD_PROJECT!==projectId||
 !process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Phase2 rules test requires exact demo project + local Firestore/Storage emulators");
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-phase2-live-candidate.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-phase2-live-candidate.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const path=(g,id)=>`activities/taipei2026/groups/${g}/${id}`;
const photo=(g,uid)=>`activities/taipei2026/groups/${g}/missions/1/${uid}/photo1.jpg`;
const jpeg=new Uint8Array([255,216,255,217]);
const mime={contentType:"image/jpeg"};
const s=uid=>env.authenticatedContext(uid);
const file=(uid,p)=>ref(s(uid).storage(bucket),p);
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  for(const groupId of ["group01","group02","group03"]){
   await setDoc(doc(ctx.firestore(),`activities/taipei2026/groups/${groupId}`),{
    phase2:true,memberCount:1,maxMembers:7,joinTokenHash:"a".repeat(64),displayName:groupId
   });
   await setDoc(doc(ctx.firestore(),path(groupId,"missions/1")),{
    status:"completed",submittedByCode:"TEST",answers:{location:groupId}
   });
  }
  await setDoc(doc(ctx.firestore(),path("group01","members/studentA")),{studentCode:"G1-S01",revoked:false});
  await setDoc(doc(ctx.firestore(),path("group01","members/revoked")),{studentCode:"G1-S02",revoked:true});
  await setDoc(doc(ctx.firestore(),path("group02","members/studentB")),{studentCode:"G2-S01",revoked:false});
  await setDoc(doc(ctx.firestore(),"teacherAccess/teacher"),{authorized:true});
  await setDoc(doc(ctx.firestore(),"teacherAccess/notTeacher"),{authorized:false});
  await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01"),{displayName:"pilot"});
  await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/members/pilotStudent"),{studentCode:"P01"});
  await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/missions/1"),{status:"completed"});
 });
 await test("Enrolled Phase2 students can read own mission but not private QR group document",async()=>{
  await assertSucceeds(getDoc(doc(s("studentA").firestore(),path("group01","missions/1"))));
  await assertFails(getDoc(doc(s("studentA").firestore(),"activities/taipei2026/groups/group01")));
  await assertFails(getDocs(collection(s("studentA").firestore(),"activities/taipei2026/groups")));
 });
 await test("Other group, revoked student, and unauthenticated person cannot read results",async()=>{
  await assertFails(getDoc(doc(s("studentA").firestore(),path("group02","missions/1"))));
  await assertFails(getDoc(doc(s("revoked").firestore(),path("group01","missions/1"))));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path("group01","missions/1"))));
 });
 await test("Student clients cannot create fake membership or modify completion or capacity",async()=>{
  await assertFails(setDoc(doc(s("outsider").firestore(),path("group01","members/outsider")),{studentCode:"X"}));
  await assertFails(updateDoc(doc(s("studentA").firestore(),"activities/taipei2026/groups/group01"),{memberCount:99}));
  await assertFails(setDoc(doc(s("studentA").firestore(),path("group01","missions/2")),{status:"completed"}));
  await assertFails(updateDoc(doc(s("studentA").firestore(),path("group01","missions/1")),{status:"pending"}));
 });
 await test("Enrolled student may upload one private jpeg only and cannot replace/delete it",async()=>{
  const p=photo("group01","studentA");
  await assertSucceeds(uploadBytes(file("studentA",p),jpeg,mime));
  await assertSucceeds(getMetadata(file("studentA",p)));
  await assertFails(uploadBytes(file("studentA",p),jpeg,mime));
  await assertFails(deleteObject(file("studentA",p)));
 });
 await test("Outsider, revoked member and cross-group cannot upload or read private photos",async()=>{
  await assertFails(uploadBytes(file("outsider",photo("group01","outsider")),jpeg,mime));
  await assertFails(uploadBytes(file("revoked",photo("group01","revoked")),jpeg,mime));
  await assertFails(uploadBytes(file("studentA",photo("group02","studentA")),jpeg,mime));
  await assertFails(getMetadata(file("studentB",photo("group01","studentA"))));
  await assertFails(uploadBytes(file("studentA",photo("group01","studentB")),jpeg,mime));
 });
 await test("Authorized teacher can view all three groups and private result photos, but not alter missions",async()=>{
  const teacher=s("teacher");
  const groups=await assertSucceeds(getDocs(collection(teacher.firestore(),"activities/taipei2026/groups")));
  assert.equal(groups.size,3);
  await assertSucceeds(getDoc(doc(teacher.firestore(),path("group03","missions/1"))));
  await assertSucceeds(getMetadata(file("teacher",photo("group01","studentA"))));
  await assertFails(setDoc(doc(teacher.firestore(),path("group01","missions/2")),{status:"completed"}));
  await assertFails(getDoc(doc(s("notTeacher").firestore(),path("group01","missions/1"))));
 });
 await test("Legacy pilot member still reads original pilot mission",async()=>{
  await assertSucceeds(getDoc(doc(s("pilotStudent").firestore(),"activities/pilot2026/groups/group01/missions/1")));
  await assertFails(getDoc(doc(s("studentA").firestore(),"activities/pilot2026/groups/group01/missions/1")));
 });
}finally{await env.cleanup();}
