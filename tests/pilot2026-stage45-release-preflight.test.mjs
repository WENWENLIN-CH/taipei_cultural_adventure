import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const conf=n=>JSON.parse(read("firebase.pilot2026-stage"+n+"-functions.json")).functions;
test("Stage4 and Stage5 are distinct Firebase Functions codebases, separate from previous stages",()=>{
 const a=conf(4),c=conf(5);
 assert.equal(a.codebase,"pilot2026-stage4");
 assert.equal(c.codebase,"pilot2026-stage5");
 assert.notEqual(a.codebase,c.codebase);
 assert.notEqual(a.source,c.source);
 for(const n of [2,3]){
  const prior=conf(n);
  assert.notEqual(prior.codebase,a.codebase);
  assert.notEqual(prior.codebase,c.codebase);
 }
 const first=JSON.parse(read("firebase.pilot2026-functions.json")).functions;
 assert.notEqual(first.codebase,a.codebase);
 assert.notEqual(first.codebase,c.codebase);
});
execFileSync(process.execPath,["scripts/build-pilot2026-stage4-functions.mjs"],{stdio:"inherit"});
execFileSync(process.execPath,["scripts/build-pilot2026-stage5-functions.mjs"],{stdio:"inherit"});
test("Each function package exports only its own scoped callable",()=>{
 for(const n of [4,5]){
  const dir=".firebase-pilot2026-stage"+n+"-functions/";
  assert.deepEqual(readdirSync(dir).sort(),["index.js","package.json","pilot-scope.js",
   "pilot2026-stage"+n+"-authorization.js","submission-core.js","submission-handler.js"]);
  const code=read(dir+"index.js");
  const exports=[...code.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
  assert.deepEqual(exports,["submitPilot2026Stage"+n]);
  assert.ok(code.includes("approvedLiveScope:PILOT2026_STAGE"+n));
  assert.ok(code.includes("allowStage"+n+"Candidate(request.data)"));
  for(const other of [1,2,3,4,5].filter(x=>x!==n))
   assert.ok(!code.includes("submitPilot2026Stage"+other));
  assert.ok(!code.includes("submitGroupMission"));
  assert.equal(JSON.parse(read(dir+"package.json")).engines.node,"22");
 }
});
test("Stage5 Storage candidate adds exactly mission5 to Stage4; previous rules remain unchanged",()=>{
 const norm=s=>s.split("\n").filter(l=>!l.trim().startsWith("//")).join("\n").replace(/\s+/g," ");
 const stage4=norm(read("docs/storage-pilot2026-stage4-candidate.rules"));
 const stage5=norm(read("docs/storage-pilot2026-stage5-candidate.rules"));
 const old='(missionId == "1" || missionId == "2" || missionId == "3" || missionId == "4")';
 assert.ok(stage4.includes(old));
 assert.equal(stage5,stage4.replace(old,
  '(missionId == "1" || missionId == "2" || missionId == "3" || missionId == "4" || missionId == "5")'));
});
test("Legacy callable and source pages are still unmodified and Stage5 is not exported live",()=>{
 for(const n of [1,2,3])
  assert.ok(read("functions/pilot2026-stage"+n+"-entry.js").includes("export const submitPilot2026Stage"+n));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage4"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage5"));
 assert.ok(!read("pilot2026-cloud-bootstrap.js").includes("submitPilot2026Stage5"));
});
