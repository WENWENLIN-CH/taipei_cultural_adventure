import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const fn=n=>JSON.parse(read("firebase.pilot2026-"+n+"-functions.json")).functions;
test("Stage4 has its own codebase and source, without changing previous functions",()=>{
 const a=fn("stage4");
 assert.equal(a.codebase,"pilot2026-stage4");
 for(const prior of ["stage2","stage3"]){
  const b=fn(prior);
  assert.notEqual(a.codebase,b.codebase);
  assert.notEqual(a.source,b.source);
 }
 const stage1=JSON.parse(read("firebase.pilot2026-functions.json")).functions;
 assert.notEqual(a.codebase,stage1.codebase);
 assert.notEqual(a.source,stage1.source);
});
execFileSync(process.execPath,["scripts/build-pilot2026-stage4-functions.mjs"],{stdio:"inherit"});
test("Stage4 deployment candidate packages only its own approved callable",()=>{
 const dir=".firebase-pilot2026-stage4-functions/";
 assert.deepEqual(readdirSync(dir).sort(),[
  "index.js","package.json","pilot-scope.js","pilot2026-stage4-authorization.js",
  "submission-core.js","submission-handler.js"
 ]);
 const entry=read(dir+"index.js");
 const exports=[...entry.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
 assert.deepEqual(exports,["submitPilot2026Stage4"]);
 assert.ok(entry.includes("approvedLiveScope:PILOT2026_STAGE4"));
 assert.ok(entry.includes("allowStage4Candidate(request.data)"));
 for(const banned of ["submitPilot2026Stage1","submitPilot2026Stage2","submitPilot2026Stage3","submitGroupMission"])
  assert.ok(!entry.includes(banned));
 assert.equal(JSON.parse(read(dir+"package.json")).engines.node,"22");
});
test("Stage4 Storage candidate differs from Stage3 by only one mission permission",()=>{
 const normalize=s=>s.split("\n").filter(l=>!l.trim().startsWith("//")).join("\n").replace(/\s+/g," ");
 const a=normalize(read("docs/storage-pilot2026-stage3-candidate.rules"));
 const b=normalize(read("docs/storage-pilot2026-stage4-candidate.rules"));
 const old='(missionId == "1" || missionId == "2" || missionId == "3")';
 const updated='(missionId == "1" || missionId == "2" || missionId == "3" || missionId == "4")';
 assert.ok(a.includes(old));
 assert.equal(b,a.replace(old,updated));
});
test("Existing three live entrypoints remain untouched by Stage4 candidate",()=>{
 for(let n=1;n<=3;n++)
  assert.ok(read("functions/pilot2026-stage"+n+"-entry.js").includes("export const submitPilot2026Stage"+n));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage4"));
 assert.ok(!read("pilot2026-cloud-bootstrap.js").includes("submitPilot2026Stage4"));
});
