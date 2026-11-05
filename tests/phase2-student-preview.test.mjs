// Build validation only: no live Firebase writes.
import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
test("Phase2 standalone student five-quest candidate builds with submissions locked",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-student-preview.mjs"],{stdio:"pipe"});
 const html=readFileSync(".firebase-preview/phase2-student-quest.html","utf8");
 const js=readFileSync(".firebase-preview/phase2-student-quest.js","utf8");
 const boot=readFileSync(".firebase-preview/phase2-student-bootstrap.js","utf8");
 const config=readFileSync(".firebase-preview/phase2-event-config.js","utf8");
 assert.match(html,/phase2-student-bootstrap[.]js/);
 assert.match(html,/phase2-student-quest[.]js/);
 assert.match(js,/taipeiCulturalQuestPhase2CandidateV1/);
 assert.match(js,/cloudQuestCompleted/);
 assert.match(js,/return doneCount\(\)===5/);
 assert.match(boot,/watchGroupMissions/);
 assert.match(boot,/submitOriginalMission/);
 assert.match(config,/enabled:false/);
});
test("Phase2 submission targets only its independent callable",()=>{
 const src=readFileSync("phase2-submission.js","utf8");
 assert.match(src,/"submitPhase2Mission"/);
 assert.doesNotMatch(src,/"submitGroupMission"|"submitPilot2026Stage/);
});
test("Original production index and website are not referenced as output",()=>{
 const src=readFileSync("scripts/build-phase2-student-preview.mjs","utf8");
 assert.match(src,/\.firebase-preview/);
 assert.doesNotMatch(src,/writeFile\(join\(root,"index.html"/);
});

test("QR error rendering initializes notice before first call",()=>{
 const src=readFileSync("phase2-student-bootstrap.js","utf8");
 assert.ok(src.indexOf("const notice=")>0);
 assert.ok(src.indexOf("const notice=")<src.indexOf('if(scannedQr.kind==="invalid")notice('));
 assert.match(src,/joinPhase2Group/);
 assert.doesNotMatch(src,/joinByInvitation/);
});
