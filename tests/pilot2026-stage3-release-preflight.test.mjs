import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const s1=JSON.parse(read("firebase.pilot2026-functions.json")).functions;
const s2=JSON.parse(read("firebase.pilot2026-stage2-functions.json")).functions;
const s3=JSON.parse(read("firebase.pilot2026-stage3-functions.json")).functions;
test("Stage3 function has independent source and codebase",()=>{
 assert.equal(s3.codebase,"pilot2026-stage3");
 assert.notEqual(s3.codebase,s1.codebase);
 assert.notEqual(s3.codebase,s2.codebase);
 assert.notEqual(s3.source,s1.source);
 assert.notEqual(s3.source,s2.source);
});
execFileSync(process.execPath,["scripts/build-pilot2026-stage3-functions.mjs"],{stdio:"inherit"});
test("Stage3 package exports exactly one approved live candidate callable",()=>{
 const dir=".firebase-pilot2026-stage3-functions/";
 assert.deepEqual(readdirSync(dir).sort(),[
  "index.js","package.json","pilot-scope.js",
  "pilot2026-stage3-authorization.js","submission-core.js","submission-handler.js"
 ]);
 const entry=read(dir+"index.js");
 const exports=[...entry.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
 assert.deepEqual(exports,["submitPilot2026Stage3"]);
 assert.ok(entry.includes("approvedLiveScope:PILOT2026_STAGE3"));
 assert.ok(entry.includes("allowStage3Candidate(request.data)"));
 assert.ok(!entry.includes("submitPilot2026Stage1"));
 assert.ok(!entry.includes("submitPilot2026Stage2"));
 assert.ok(!entry.includes("submitGroupMission"));
 assert.equal(JSON.parse(read(dir+"package.json")).engines.node,"22");
});
test("Candidate Storage rule extends only group01 with mission3, retaining the exact Stage2 rules",()=>{
 const normalized=s=>s.split("\n").filter(line=>!line.trim().startsWith("//")).join("\n").replace(/\s+/g," ");
 const old=normalized(read("docs/storage-pilot2026-stage2-candidate.rules"));
 const next=normalized(read("docs/storage-pilot2026-stage3-candidate.rules"));
 const v='(missionId == "1" || missionId == "2")';
 assert.ok(old.includes(v));
 assert.equal(next,old.replace(v,'(missionId == "1" || missionId == "2" || missionId == "3")'));
});
test("Existing Stage1, Stage2 and demo entrypoints remain separate and deployed sources unchanged",()=>{
 assert.ok(read("functions/pilot2026-stage1-entry.js").includes("export const submitPilot2026Stage1"));
 assert.ok(read("functions/pilot2026-stage2-entry.js").includes("export const submitPilot2026Stage2"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage3"));
 assert.ok(!read("pilot2026-cloud-bootstrap.js").includes("submitPilot2026Stage3"));
});
