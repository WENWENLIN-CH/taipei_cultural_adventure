import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const stage2=JSON.parse(read("firebase.pilot2026-stage2-functions.json"));
const stage1=JSON.parse(read("firebase.pilot2026-functions.json"));
const demo=JSON.parse(read("firebase.functions-pilot.json"));
test("Stage2 has independent source and codebase, not Stage1 or demo",()=>{
 assert.equal(stage2.functions.codebase,"pilot2026-stage2");
 assert.notEqual(stage2.functions.codebase,stage1.functions.codebase);
 assert.notEqual(stage2.functions.codebase,demo.functions.codebase);
 assert.notEqual(stage2.functions.source,stage1.functions.source);
 assert.notEqual(stage2.functions.source,demo.functions.source);
});
execFileSync(process.execPath,["scripts/build-pilot2026-stage2-functions.mjs"],{stdio:"inherit"});
test("package exactly one Stage2 callable with pinned runtime dependencies",()=>{
 const path=".firebase-pilot2026-stage2-functions/";
 assert.deepEqual(readdirSync(path).sort(),[
  "index.js","package.json","pilot-scope.js",
  "pilot2026-stage2-authorization.js","submission-core.js","submission-handler.js"
 ]);
 const js=read(path+"index.js");
 const exports=[...js.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(x=>x[1]);
 assert.deepEqual(exports,["submitPilot2026Stage2"]);
 assert.ok(js.includes("approvedLiveScope:PILOT2026_STAGE2"));
 assert.ok(js.includes("allowStage2Candidate(request.data)"));
 assert.ok(!js.includes("submitPilot2026Stage1"));
 assert.ok(!js.includes("submitGroupMission"));
 const pkg=JSON.parse(read(path+"package.json"));
 assert.equal(pkg.engines.node,"22");
 assert.ok(pkg.dependencies["firebase-admin"]);
 assert.ok(pkg.dependencies["firebase-functions"]);
});
test("existing deployed entrypoints are untouched",()=>{
 assert.ok(read("functions/index.js").includes("export const submitGroupMission=onCall"));
 assert.ok(read("functions/pilot2026-stage1-entry.js").includes("export const submitPilot2026Stage1=onCall"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage2"));
});
test("stage2 rule differs from stage1 by exactly one scoped permission and comments",()=>{
 const clean=src=>src.split("\n").filter(line=>!line.trim().startsWith("//")).join("\n")
  .replace(/\s+/g," ");
 const first=clean(read("docs/storage-pilot2026-stage1-candidate.rules"));
 const second=clean(read("docs/storage-pilot2026-stage2-candidate.rules"));
 assert.ok(first.includes('groupId == "group01" && missionId == "1"'));
 assert.equal(second,first.replace('groupId == "group01" && missionId == "1"',
  'groupId == "group01" && (missionId == "1" || missionId == "2")'));
 assert.ok(!read("docs/storage-pilot2026-stage2-candidate.rules").includes("\\n"));
});
