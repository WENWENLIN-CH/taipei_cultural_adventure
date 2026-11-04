import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync,readdirSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const cfg=JSON.parse(read("firebase.pilot2026-functions.json"));
const old=JSON.parse(read("firebase.functions-pilot.json"));
test("pilot2026 codebase has a different source and codebase ID from demo callable",()=>{
 assert.notEqual(cfg.functions.codebase,old.functions.codebase);
 assert.notEqual(cfg.functions.source,old.functions.source);
 assert.equal(cfg.functions.codebase,"pilot2026-stage1");
});
execFileSync(process.execPath,["scripts/build-pilot2026-functions.mjs"],{stdio:"inherit"});
test("isolated source contains exactly its pinned runtime dependencies",()=>{
 const entries=readdirSync(".firebase-pilot2026-functions").sort();
 assert.deepEqual(entries,["index.js","package.json","pilot-scope.js","pilot2026-authorization.js","submission-core.js","submission-handler.js"]);
 const pkg=JSON.parse(read(".firebase-pilot2026-functions/package.json"));
 assert.equal(pkg.main,"index.js");
 assert.equal(pkg.engines.node,"22");
 assert.ok(pkg.dependencies["firebase-admin"]);
 assert.ok(pkg.dependencies["firebase-functions"]);
});
test("pilot2026 runtime exports only one stage1 callable",()=>{
 const code=read(".firebase-pilot2026-functions/index.js");
 const exported=[...code.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(match=>match[1]);
 assert.deepEqual(exported,["submitPilot2026Stage1"]);
 assert.ok(code.includes('allowCandidateSubmission({stage:"stage1",data:request.data})'));
 assert.ok(code.includes("approvedLiveScope:PILOT2026_STAGE1"));
 assert.ok(!code.includes('from "./functions/'));
});
test("legacy function and live client remain unchanged and disabled",()=>{
 const legacy=read("functions/index.js");
 assert.ok(legacy.includes('request.data?.activityId!=="demo2026"'));
 assert.ok(legacy.includes('request.data?.groupId!=="group01"'));
 assert.ok(legacy.includes('Number(request.data?.missionId)!==3'));
 assert.ok(!legacy.includes('submitPilot2026Stage1=onCall('));
 assert.ok(read("pilot2026-cloud-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
});
