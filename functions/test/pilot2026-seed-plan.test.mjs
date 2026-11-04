import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const functionsDir=join(dirname(fileURLToPath(import.meta.url)),"..");
import {makePlan,verifyLiveOptIn,applyPlan,PILOT_BASE} from "../scripts/prepare-pilot2026-stage1.mjs";

test("dry-run prints a plan with no invitation secret and no Firebase writes",()=>{
 const output=execFileSync(process.execPath,["scripts/prepare-pilot2026-stage1.mjs"],{cwd:functionsDir,encoding:"utf8"});
 const plan=JSON.parse(output);
 assert.equal(plan.mode,"DRY_RUN_NO_WRITES");
 assert.equal(plan.project,"taipei-cultural-adventure");
 assert.equal(plan.groupDocument,PILOT_BASE);
 assert.equal(plan.missionDocumentsCreated,0);
 assert.ok(!/\b[a-f0-9]{48}\b/.test(output),"Never print private invitation in dry-run");
});
test("live invocation requires strict operator args and environment",()=>{
 const exact=["--apply","--project=taipei-cultural-adventure","--confirm=CREATE_PILOT2026_GROUP01"];
 assert.throws(()=>verifyLiveOptIn([],{}));
 assert.throws(()=>verifyLiveOptIn(["--apply"],{}));
 assert.throws(()=>verifyLiveOptIn(exact,{}));
 assert.throws(()=>verifyLiveOptIn(exact,{ALLOW_PILOT2026_SEED:"YES",GCLOUD_PROJECT:"other-project"}));
 assert.throws(()=>verifyLiveOptIn(exact,{ALLOW_PILOT2026_SEED:"YES",GCLOUD_PROJECT:"taipei-cultural-adventure",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"}));
 assert.equal(verifyLiveOptIn(exact,{ALLOW_PILOT2026_SEED:"YES",GCLOUD_PROJECT:"taipei-cultural-adventure"}),true);
});
test("creation transaction checks existing group and invite before any write",async()=>{
 const token="a".repeat(48);
 const records=new Map();
 let transactionCount=0;
 const db={doc:path=>({path}),runTransaction:async body=>{
  transactionCount++;
  let writes=[];
  const tx={
   get:async ref=>({exists:records.has(ref.path)}),
   create:(ref,value)=>writes.push([ref.path,value])
  };
  await body(tx);
  for(const [path,value] of writes)records.set(path,value);
 }};
 await applyPlan({db,plan:makePlan(),token,serverTimestamp:()=>({seconds:1})});
 assert.equal(records.size,2);
 assert.equal(records.get("invites/"+token).claimedBy,null);
 assert.equal(records.get("invites/"+token).activityId,"pilot2026");
 assert.equal(records.get(PILOT_BASE).displayName,"試辦第一組");
 await assert.rejects(applyPlan({db,plan:makePlan(),token,serverTimestamp:()=>({seconds:2})}),/already exists/);
 assert.equal(records.size,2);
 assert.equal(transactionCount,2);
});
test("reject invalid token and unrelated plan",async()=>{
 const db={doc:()=>{throw Error("No Firestore operations expected");}};
 await assert.rejects(applyPlan({db,plan:makePlan(),token:"not-hex",serverTimestamp:()=>0}));
 const wrong={...makePlan(),group:"group02"};
 await assert.rejects(applyPlan({db,plan:wrong,token:"a".repeat(48),serverTimestamp:()=>0}));
});
