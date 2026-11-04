import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("production callable remains strictly demo2026/group01/mission3",()=>{
 const fn=read("functions/index.js");
 assert.ok(fn.includes('request.data?.activityId!=="demo2026"'));
 assert.ok(fn.includes('request.data?.groupId!=="group01"'));
 assert.ok(fn.includes('Number(request.data?.missionId)!==3'));
 assert.ok(fn.includes("!process.env.FIRESTORE_EMULATOR_HOST"));
 assert.ok(!fn.includes('PROPOSED_ISOLATED_PILOT'),"Proposed pilot must NOT be activated");
});
test("server handler still rejects every non-demo2026 activity",()=>{
 const fn=read("functions/submission-handler.js");
 assert.ok(fn.includes('input.activityId!=="demo2026"'));
 assert.ok(!fn.includes("pilot2026"));
});
test("read-only five-quest UI stays disabled; mission3 pilot stays scoped",()=>{
 const boot=read("cloud-quest-bootstrap.js");
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(boot.includes('const PILOT_GROUP="group01";'));
 assert.ok(boot.includes("const PILOT_MISSION=3;"));
 assert.ok(!boot.includes("pilot2026"));
});
test("new emulator pilot scope is not injected into the live callable",()=>{
 const index=read("functions/index.js");
 const handler=read("functions/submission-handler.js");
 assert.ok(!index.includes("emulatorPilotScope:"),"Live callable must not activate pilot scope");
 assert.ok(handler.includes('process.env.GCLOUD_PROJECT!=="demo-taipei-isolated-pilot"'),
   "Emulator pilot must be locked to a dedicated demo project");
 assert.ok(handler.includes('process.env.FIREBASE_STORAGE_EMULATOR_HOST===undefined'),
   "Emulator pilot must require Storage emulator");
 assert.ok(handler.includes('process.env.FIRESTORE_EMULATOR_HOST===undefined'),
   "Emulator pilot must require Firestore emulator");
});
test("scope definition has no network or mutation imports",()=>{
 const src=read("functions/pilot-scope.js");
 assert.ok(!/firebase-admin|firebase-functions|getFirestore|setDoc|firebase deploy/.test(src));
});
