import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {makePlan,makeGroupKeys,hashCode,verifyApply,applyPlan,GROUP_IDS} from "../functions/scripts/create-phase2-three-groups.mjs";
test("Three reusable QR groups have 7 seats each",()=>{
 const p=makePlan();
 assert.equal(p.mode,"DRY_RUN_NO_WRITES");
 assert.deepEqual(p.groups.map(x=>x.groupId),GROUP_IDS);
 assert.ok(p.groups.every(x=>x.capacity===7&&x.qrCodes===1&&x.reusable));
 assert.equal(p.totalStudents,21);
 assert.equal(p.qrCodesToGenerate,3);
 assert.equal(p.oneTimeInvitesToGenerate,0);
});
test("Exactly 3 unique secret codes, with separate SHA256 hashes",()=>{
 const keys=makeGroupKeys();
 assert.equal(keys.length,3);
 assert.equal(new Set(keys.map(x=>x.code)).size,3);
 assert.equal(new Set(keys.map(x=>hashCode(x.code))).size,3);
 assert.ok(keys.every(x=>/^[a-f0-9]{48}$/.test(x.code)));
});
test("Live creation needs explicit project and opt-in",()=>{
 const args=["--apply","--project=taipei-cultural-adventure","--confirm=CREATE_TAIPEI2026_THREE_GROUPS"];
 assert.throws(()=>verifyApply(args,{}));
 assert.throws(()=>verifyApply(args,{GCLOUD_PROJECT:"wrong",ALLOW_PHASE2_CREATE:"YES"}));
 assert.throws(()=>verifyApply(args,{GCLOUD_PROJECT:"taipei-cultural-adventure",ALLOW_PHASE2_CREATE:"YES",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"}));
 assert.equal(verifyApply(args,{GCLOUD_PROJECT:"taipei-cultural-adventure",ALLOW_PHASE2_CREATE:"YES"}),true);
});
test("Existing groups are protected by create-only transaction",async()=>{
 const plan=makePlan(),keys=makeGroupKeys();
 let writes=0;
 const db={doc:path=>({path}),runTransaction:fn=>fn({
  get:async ref=>({exists:ref.path===plan.groups[0].groupPath}),
  create:()=>writes++
 })};
 await assert.rejects(applyPlan({db,plan,keys,serverTimestamp:()=>0}),/overwrite/);
 assert.equal(writes,0);
});
test("Dry run never writes or reveals secrets",()=>{
 const out=execFileSync(process.execPath,["functions/scripts/create-phase2-three-groups.mjs"],{encoding:"utf8"});
 assert.match(out,/DRY_RUN_NO_WRITES/);
 assert.match(out,/"qrCodesToGenerate": 3/);
 assert.doesNotMatch(out,/[a-f0-9]{48}/);
});
