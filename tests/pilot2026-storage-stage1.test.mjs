import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,setDoc} from "firebase/firestore";
import {ref,uploadBytes,getMetadata} from "firebase/storage";
if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST)
 throw Error("Run only under Firebase Firestore and Storage emulators");
const projectId="demo-taipei-pilot-stage1-rules";
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-group-draft.rules","utf8")},
 storage:{host:"127.0.0.1",port:9199,rules:readFileSync("docs/storage-pilot2026-stage1-candidate.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const image=new Uint8Array([255,216,255,217]);
const mime={contentType:"image/jpeg"};
const pilotPath=(group,mission,uid,file)=>`activities/pilot2026/groups/${group}/missions/${mission}/${uid}/${file}`;
const demoPath=`activities/demo2026/groups/group01/missions/3/demoStudent/photo1.jpg`;
const pilotUser=env.authenticatedContext("pilotStudent");
const otherUser=env.authenticatedContext("otherPilot");
const demoUser=env.authenticatedContext("demoStudent");
const pilotRef=(group,mission,file="photo1.jpg",uid="pilotStudent")=>ref(pilotUser.storage(bucket),pilotPath(group,mission,uid,file));
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,"activities/pilot2026/groups/group01/members/pilotStudent"),{studentCode:"TEST01"});
  await setDoc(doc(db,"activities/pilot2026/groups/group02/members/otherPilot"),{studentCode:"TEST02"});
  await setDoc(doc(db,"activities/demo2026/groups/group01/members/demoStudent"),{studentCode:"S02"});
 });
 await test("pilot2026 group01 mission1 photo1 accepts one JPEG",async()=>{
  await assertSucceeds(uploadBytes(pilotRef("group01","1"),image,mime));
  await assertSucceeds(getMetadata(pilotRef("group01","1")));
 });
 await test("pilot2026 photo cannot be overwritten",()=>assertFails(uploadBytes(pilotRef("group01","1"),image,mime)));
 await test("pilot2026 group01 mission2 rejects upload",()=>assertFails(uploadBytes(pilotRef("group01","2","lang1_photo.jpg"),image,mime)));
 await test("pilot2026 group01 mission3 rejects upload",()=>assertFails(uploadBytes(pilotRef("group01","3"),image,mime)));
 await test("pilot2026 group02 mission1 rejects upload even for its own member",()=>assertFails(uploadBytes(ref(otherUser.storage(bucket),pilotPath("group02","1","otherPilot","photo1.jpg")),image,mime)));
 await test("pilot2026 wrong uploader cannot create photo",()=>assertFails(uploadBytes(pilotRef("group01","1","photo1.jpg","otherPilot"),image,mime)));
 await test("unlisted activities cannot upload even when their member document exists",async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),"activities/unknown2026/groups/group01/members/pilotStudent"),{studentCode:"X"});
  });
  await assertFails(uploadBytes(ref(pilotUser.storage(bucket),"activities/unknown2026/groups/group01/missions/1/pilotStudent/photo1.jpg"),image,mime));
 });
 await test("demo2026 group01 mission3 remains allowed",async()=>{
  await assertSucceeds(uploadBytes(ref(demoUser.storage(bucket),demoPath),image,mime));
  await assertSucceeds(getMetadata(ref(demoUser.storage(bucket),demoPath)));
 });
 await test("nonmembers cannot read pilot photo",()=>assertFails(getMetadata(ref(otherUser.storage(bucket),pilotPath("group01","1","pilotStudent","photo1.jpg")))));
}finally{await env.cleanup();}
