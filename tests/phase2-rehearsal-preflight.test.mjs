import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
test("Rehearsal build contains only dedicated callable exports",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-rehearsal-functions.mjs"]);
 const index=readFileSync(".firebase-phase2-rehearsal-functions/index.js","utf8");
 assert.match(index,/taipei2026rehearsal/);
 assert.match(index,/export const joinPhase2RehearsalGroup/);
 assert.match(index,/export const submitPhase2RehearsalMission/);
 assert.doesNotMatch(index,/ACTIVITY="taipei2026"/);
});
test("Private mobile rehearsal preview differs from locked official client",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-rehearsal-hosting.mjs"]);
 const cfg=readFileSync(".firebase-phase2-rehearsal-hosting/phase2-event-config.js","utf8");
 const prod=readFileSync("phase2-event-config.js","utf8");
 assert.match(cfg,/enabled:true/);
 assert.match(cfg,/activityId:"taipei2026rehearsal"/);
 assert.match(cfg,/joinPhase2RehearsalGroup/);
 assert.match(cfg,/submitPhase2RehearsalMission/);
 assert.match(prod,/enabled:false/);
 assert.match(prod,/activityId:"taipei2026"/);
});
test("Rehearsal and official Hosting targets are separated",()=>{
 const rehearsal=JSON.parse(readFileSync("firebase.phase2-rehearsal-hosting.json","utf8"));
 const official=JSON.parse(readFileSync("firebase.phase2-locked-hosting.json","utf8"));
 assert.notEqual(rehearsal.hosting.public,official.hosting.public);
});
test("Rehearsal tests never provision or point at the official activity",()=>{
 const setup=readFileSync("functions/scripts/create-phase2-rehearsal-groups.mjs","utf8");
 const entry=readFileSync("functions/phase2-rehearsal-live-entry.js","utf8");
 assert.match(setup,/activity="taipei2026rehearsal"/);
 assert.match(entry,/ACTIVITY="taipei2026rehearsal"/);
 assert.match(setup,/refusing overwrite|refusing to create or overwrite|refusing overwrite|refusing cloud creation/i);
});

test("QR join and auth restore cannot race the active island back to start",()=>{
 const boot=readFileSync("phase2-student-bootstrap.js","utf8");
 assert.match(boot,/let authFlow=Promise[.]resolve\(\)/);
 assert.match(boot,/authFlow=authFlow[.]catch/);
 assert.match(boot,/if\(group\)return true;/);
 assert.match(boot,/if\(group\)\{render\(\);return;\}/);
 assert.match(boot,/if\(!joining\)/);
});
