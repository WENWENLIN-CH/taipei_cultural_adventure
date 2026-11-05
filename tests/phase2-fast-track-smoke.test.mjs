// Static fast-track smoke checks. No Firebase access or deployment.
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
test("Phase2 callable is isolated from legacy functions index",async()=>{
 const legacy=await read("functions/index.js"),phase2=await read("functions/phase2-live-entry.js");
 assert.doesNotMatch(legacy,/phase2-live-entry|submitPhase2Mission/);
 assert.match(phase2,/export const submitPhase2Mission=onCall/);
 assert.match(phase2,/PHASE2_ACTIVITY_ID/);
 assert.match(phase2,/PHASE2_GROUP_IDS/);
 assert.match(phase2,/transactionGuard/);
});
test("Phase2 live config uses its own codebase",async()=>{
 const cfg=JSON.parse(await read("firebase.phase2-live-functions.json"));
 assert.equal(cfg.functions.codebase,"phase2-live");
 assert.equal(cfg.functions.source,".firebase-phase2-live-functions");
});
test("Teacher preview can select only explicitly allowed sandbox",async()=>{
 const js=await read("teacher-dashboard.js"),html=await read("teacher-dashboard.html");
 assert.match(js,/\["demo2026","pilot2026","phase2sandbox","taipei2026"\]/);
 assert.match(html,/value="phase2sandbox"/);
});
test("Existing five original pilot entrypoints are still separate files",async()=>{
 for(let n=1;n<=5;n++)assert.match(await read(`functions/pilot2026-stage${n}-entry.js`),new RegExp(`submitPilot2026Stage${n}`));
});

test("Reusable Phase2 QR enrollment is separate from old single-use invitations",async()=>{
 const entry=await read("functions/phase2-live-entry.js");
 const join=await read("functions/phase2-join-handler.js");
 const boot=await read("phase2-student-bootstrap.js");
 const setup=await read("functions/scripts/create-phase2-three-groups.mjs");
 assert.match(entry,/export const joinPhase2Group=onCall/);
 assert.match(join,/memberCount/);
 assert.match(join,/maxMembers!==7/);
 assert.match(boot,/readAndClearPhase2Qr/);
 assert.match(boot,/joinPhase2Group/);
 assert.doesNotMatch(boot,/joinByInvitation/);
 assert.match(setup,/STUDENTS_PER_GROUP=7/);
 assert.match(setup,/joinTokenHash/);
});

test("Teacher dashboard explicitly indicates final unlock without extra surveillance fields",async()=>{
 const dashboard=await read("teacher-dashboard.js");
 assert.match(dashboard,/最終任務：/);
 assert.match(dashboard,/completedCount===5/);
});
