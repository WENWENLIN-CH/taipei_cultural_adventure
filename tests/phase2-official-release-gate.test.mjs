import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync,readdirSync} from "node:fs";
test("Official Hosting candidate is scoped, spoiler-free, teacher read-only, source still locked",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-official-hosting.mjs"],{stdio:"pipe"});
 const dir=".firebase-phase2-official-hosting/";
 const config=readFileSync(dir+"phase2-event-config.js","utf8");
 const source=readFileSync("phase2-event-config.js","utf8");
 const student=readFileSync(dir+"phase2-student-quest.html","utf8");
 const studentJs=readFileSync(dir+"phase2-student-quest.js","utf8");
 const teacher=readFileSync(dir+"teacher-dashboard.html","utf8");
 const teacherJs=readFileSync(dir+"teacher-dashboard.js","utf8");
 assert.match(source,/enabled:false/);
 assert.match(config,/enabled:true/);
 assert.match(config,/activityId:"taipei2026"/);
 assert.doesNotMatch(config,/rehearsal|joinCallable|submitCallable/);
 assert.match(student,/神秘的最終任務/);
 assert.doesNotMatch(student,/五關完成自動解鎖圓山|酒泉街謎題/);
 assert.doesNotMatch(student,/id="cloudInvite"|id="cloudLogin"|id="cloudJoin"/);
 assert.doesNotMatch(studentJs,/_restaurant/);
 assert.match(teacher,/value="taipei2026"/);
 assert.doesNotMatch(teacher,/value="taipei2026rehearsal"/);
 assert.match(teacherJs,/ALLOWED_ACTIVITIES=Object[.]freeze\(\["taipei2026"\]\)/);
 assert.match(teacherJs,/let activityId="taipei2026"/);
 assert.match(teacherJs,/submittedByCode/);
 assert.match(teacherJs,/submittedAt/);
 assert.match(teacherJs,/getBlob/);
 for(const forbidden of ["addDoc(","setDoc(","updateDoc(","deleteDoc(","getDownloadURL("])
  assert.ok(!teacherJs.includes(forbidden));
 assert.equal(readdirSync(dir).length,19);
});
test("Official release codebase packaging remains scoped to two Phase2 live callables",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-live-functions.mjs"],{stdio:"pipe"});
 const index=readFileSync(".firebase-phase2-live-functions/index.js","utf8");
 const manifest=readFileSync(".firebase-phase2-live-functions/.env.taipei-cultural-adventure","utf8");
 const core=readFileSync(".firebase-phase2-live-functions/submission-core.js","utf8");
 assert.match(index,/export const submitPhase2Mission/);
 assert.match(index,/export const joinPhase2Group/);
 assert.match(manifest,/PHASE2_ACTIVITY_ID=taipei2026/);
 assert.match(core,/taipei2026rehearsal/);
 assert.match(core,/taipei2026/);
});

test("Official admission accepts 10 seats and preserves 7-seat rehearsal; gated updater never recreates groups",()=>{
 const join=readFileSync("functions/phase2-join-handler.js","utf8");
 const updater=readFileSync("functions/scripts/upgrade-phase2-official-capacity.mjs","utf8");
 const check=readFileSync("functions/scripts/check-phase2-official-launch-state.mjs","utf8");
 assert.match(join,/\[7,10\][.]includes\(info[.]maxMembers\)/);
 assert.match(join,/count>=info[.]maxMembers/);
 assert.match(updater,/ALLOW_PHASE2_CAPACITY_CHANGE/);
 assert.match(updater,/tx[.]update\(refs\[i\],\{maxMembers:10\}\)/);
 assert.doesNotMatch(updater,/tx[.]create\(/);
 assert.match(check,/d[.]maxMembers===10/);
});
