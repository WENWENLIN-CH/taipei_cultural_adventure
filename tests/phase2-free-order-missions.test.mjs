import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

test("Student client permits any uncompleted mission once all 5 snapshots connect",()=>{
 const boot=readFileSync("phase2-student-bootstrap.js","utf8");
 assert.match(boot,/window[.]cloudQuestMaySubmit=id=>enabled && allowed\(group\) && seen[.]size===5 && !submitting/);
 assert.match(boot,/!completed[.]has\(Number\(id\)\)\s*;/);
 assert.doesNotMatch(boot,/completed[.]has\(Number\(id\)-1\)/);
 assert.match(boot,/window[.]cloudQuestCompleted=id=>completed[.]has/);
 assert.match(boot,/window[.]cloudQuestShowSharedMission/);
});

test("Both callable deployments allow out-of-order missions, preserving duplicate-protected transaction",()=>{
 for(const file of ["functions/phase2-live-entry.js","functions/phase2-rehearsal-live-entry.js"]){
  const entry=readFileSync(file,"utf8");
  assert.match(entry,/createSubmissionHandler\(/);
  assert.doesNotMatch(entry,/transactionGuard\s*:/);
  assert.doesNotMatch(entry,/請先完成(?:上一關|前一關)/);
 }
 const handler=readFileSync("functions/submission-handler.js","utf8");
 assert.match(handler,/if\(existing[.]exists\) return fail\("already-exists"/);
 assert.match(handler,/tx[.]create\(missionRef/);
 assert.match(handler,/memberNow[.]data\(\)[?][.]revoked===true/);
 assert.match(handler,/parseVerifiedPhotoPath/);
});

test("Rehearsal and official artifacts both have free-order student instruction, final still requires five",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-rehearsal-hosting.mjs"],{stdio:"pipe"});
 execFileSync(process.execPath,["scripts/build-phase2-official-hosting.mjs"],{stdio:"pipe"});
 for(const root of [".firebase-phase2-rehearsal-hosting/",".firebase-phase2-official-hosting/"]){
  const html=readFileSync(root+"phase2-student-quest.html","utf8");
  const js=readFileSync(root+"phase2-student-quest.js","utf8");
  assert.match(html,/五關不限順序/);
  assert.match(html,/完成五關後將開啟神秘的最終任務/);
  assert.match(js,/return doneCount\(\)===5/);
  assert.match(js,/window[.]cloudQuestMaySubmit/);
  assert.match(js,/window[.]cloudQuestShowSharedMission/);
 }
 const officialConfig=readFileSync(".firebase-phase2-official-hosting/phase2-event-config.js","utf8");
 const rehearsalConfig=readFileSync(".firebase-phase2-rehearsal-hosting/phase2-event-config.js","utf8");
 assert.match(officialConfig,/activityId:"taipei2026"/);
 assert.match(rehearsalConfig,/activityId:"taipei2026rehearsal"/);
});
