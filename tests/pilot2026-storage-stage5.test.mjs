import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,setDoc} from "firebase/firestore";
import {ref,uploadBytes,getMetadata,deleteObject} from "firebase/storage";
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Storage Stage5 tests require Firestore and Storage emulators");
const projectId="demo-taipei-pilot-stage5-rules";
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-group-draft.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-pilot2026-stage5-candidate.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const jpeg=new Uint8Array([255,216,255,217]),mime={contentType:"image/jpeg"};
const stage=(group,mission,uid,file)=>`activities/pilot2026/groups/${group}/missions/${mission}/${uid}/${file}`;
const member=env.authenticatedContext("member"),outsider=env.authenticatedContext("outsider");
const group02=env.authenticatedContext("group02"),demo=env.authenticatedContext("demo");
const storageRef=(path,ctx=member)=>ref(ctx.storage(bucket),path);
const photo1=stage("group01","5","member","p1_photo.jpg");
const photo2=stage("group01","5","member","p2_photo.jpg");
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/members/member"),{studentCode:"TEST02"});
  await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group02/members/group02"),{studentCode:"X"});
  await setDoc(doc(ctx.firestore(),"activities/demo2026/groups/group01/members/demo"),{studentCode:"D"});
 });
 await test("Stage5 allows three image/jpeg photos for same enrolled UID",async()=>{
  await assertSucceeds(uploadBytes(storageRef(photo1),jpeg,mime));
  await assertSucceeds(uploadBytes(storageRef(photo2),jpeg,mime));
  await assertSucceeds(uploadBytes(storageRef(stage("group01","5","member","p3_photo.jpg")),jpeg,mime));
  await assertSucceeds(getMetadata(storageRef(photo1)));
  await assertSucceeds(getMetadata(storageRef(photo2)));
 });
 await test("Stage5 photos cannot be overwritten or deleted",async()=>{
  await assertFails(uploadBytes(storageRef(photo1),jpeg,mime));
  await assertFails(deleteObject(storageRef(photo2)));
 });
 await test("Stage5 rejects wrong filenames and invalid MIME",async()=>{
  await assertFails(uploadBytes(storageRef(stage("group01","5","member","p4_photo.jpg")),jpeg,mime));
  await assertFails(uploadBytes(storageRef(stage("group01","5","member","p1_photo.png")),jpeg,{contentType:"image/png"}));
  await assertFails(uploadBytes(storageRef(stage("group01","5","member","p1_photo.jpg")),jpeg,{contentType:"image/png"}));
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/members/fresh"),{studentCode:"F"});
  });
  const fresh=env.authenticatedContext("fresh");
  await assertFails(uploadBytes(storageRef(stage("group01","5","fresh","p1_photo.jpg"),fresh),jpeg,{contentType:"image/png"}));
 });
 await test("Stage5 rejects outsider, another group, and impersonated UID",async()=>{
  await assertFails(uploadBytes(storageRef(stage("group01","5","outsider","p1_photo.jpg"),outsider),jpeg,mime));
  await assertFails(uploadBytes(storageRef(stage("group02","5","group02","p1_photo.jpg"),group02),jpeg,mime));
  await assertFails(uploadBytes(storageRef(stage("group01","5","outsider","p2_photo.jpg")),jpeg,mime));
  await assertFails(getMetadata(storageRef(photo1,outsider)));
 });
 await test("Existing stages1-4 retain permissions and Stage5 is newly allowed",async()=>{
  await assertSucceeds(uploadBytes(storageRef(stage("group01","1","member","photo1.jpg")),jpeg,mime));
  await assertSucceeds(uploadBytes(storageRef(stage("group01","2","member","lang1_photo.jpg")),jpeg,mime));
  await assertSucceeds(uploadBytes(storageRef(stage("group01","3","member","photo1.jpg")),jpeg,mime));
  await assertSucceeds(uploadBytes(storageRef(stage("group01","4","member","c1_photo.jpg")),jpeg,mime));
 });
 await test("Existing demo permission unchanged",async()=>{
  await assertSucceeds(uploadBytes(storageRef("activities/demo2026/groups/group01/missions/3/demo/photo1.jpg",demo),jpeg,mime));
 });
 await test("Fifth stage rejects oversized JPEG",async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/members/large"),{studentCode:"L"});
  });
  const large=env.authenticatedContext("large");
  const big=new Uint8Array(1024*1024+1);big.set([255,216,255]);
  await assertFails(uploadBytes(storageRef(stage("group01","5","large","p1_photo.jpg"),large),big,mime));
 });
}finally{await env.cleanup();}
