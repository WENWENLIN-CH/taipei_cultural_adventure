import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {countsFromArgs,makePlan,makeInvites,verifyApply,applyPlan,ACTIVITY,GROUP_IDS} from "../functions/scripts/create-phase2-three-groups.mjs";

const counts=()=>countsFromArgs(["--group01=5","--group02=6","--group03=4"]);
test("Dry-run plans exactly three distinct groups and unique student codes",()=>{
 const p=makePlan(counts());
 assert.equal(p.mode,"DRY_RUN_NO_WRITES");
 assert.equal(p.activityId,ACTIVITY);
 assert.deepEqual(p.groups.map(g=>g.groupId),GROUP_IDS);
 assert.equal(p.privateInvitesToCreate,15);
 assert.equal(new Set(p.groups.flatMap(g=>g.studentCodes)).size,15);
 assert.equal(p.missionDocumentsCreated??0,0);
});
test("Invalid counts, missing group and extra group are rejected",()=>{
 for(const args of [
  ["--group01=2","--group02=2"],
  ["--group01=0","--group02=2","--group03=2"],
  ["--group01=31","--group02=2","--group03=2"],
  ["--group01=2","--group02=2","--group03=2","--group04=2"]
 ])assert.throws(()=>countsFromArgs(args));
});
test("Invitation tokens are 48 hex and individually unique",()=>{
 const p=makePlan(counts());
 const list=makeInvites(p);
 assert.equal(list.length,15);
 assert.equal(new Set(list.map(i=>i.token)).size,15);
 assert.ok(list.every(i=>/^[a-f0-9]{48}$/.test(i.token)));
});
test("Live creation requires explicit confirmation and matching environment",()=>{
 const args=["--apply","--project=taipei-cultural-adventure","--confirm=CREATE_TAIPEI2026_THREE_GROUPS"];
 assert.throws(()=>verifyApply(args,{}));
 assert.throws(()=>verifyApply(args,{GCLOUD_PROJECT:"demo-test",ALLOW_PHASE2_CREATE:"YES"}));
 assert.throws(()=>verifyApply(args,{GCLOUD_PROJECT:"taipei-cultural-adventure",ALLOW_PHASE2_CREATE:"YES",FIRESTORE_EMULATOR_HOST:"localhost:8080"}));
 assert.equal(verifyApply(args,{GCLOUD_PROJECT:"taipei-cultural-adventure",ALLOW_PHASE2_CREATE:"YES"}),true);
});
test("Create-only transaction never overwrites an existing group",async()=>{
 const p=makePlan(counts()),entries=makeInvites(p);
 let writes=0;
 const db={
  doc:path=>({path}),
  runTransaction:fn=>fn({
   get:async ref=>({exists:ref.path===p.groups[0].groupPath}),
   create:()=>{writes++;}
  })
 };
 await assert.rejects(applyPlan({db,plan:p,entries,serverTimestamp:()=>0}),/no overwrite/);
 assert.equal(writes,0);
});
test("Default command is dry-run and never prints private tokens",()=>{
 const stdout=execFileSync(process.execPath,["functions/scripts/create-phase2-three-groups.mjs",
  "--group01=3","--group02=4","--group03=5"],{encoding:"utf8"});
 assert.match(stdout,/DRY_RUN_NO_WRITES/);
 assert.match(stdout,/privateInvitesToCreate/);
 assert.doesNotMatch(stdout,/[a-f0-9]{48}/);
});
