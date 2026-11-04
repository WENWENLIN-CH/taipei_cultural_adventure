import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=p=>readFileSync(p,"utf8");

test("existing live callable retains legacy scoped mission and does not export stage1",()=>{
 const index=src("functions/index.js");
 assert.ok(index.includes('request.data?.activityId!=="demo2026"'));
 assert.ok(index.includes('request.data?.groupId!=="group01"'));
 assert.ok(index.includes('Number(request.data?.missionId)!==3'));
 assert.ok(!index.includes("pilot2026-stage1-entry"));
 assert.ok(!index.includes("submitPilot2026Stage1"));
 assert.ok(!index.includes("approvedLiveScope"));
});
test("pilot2026 callable is a separate unexported candidate with exact stage1 scope",()=>{
 const entry=src("functions/pilot2026-stage1-entry.js");
 assert.ok(entry.includes('export const submitPilot2026Stage1=onCall('));
 assert.ok(entry.includes("approvedLiveScope:PILOT2026_STAGE1"));
 assert.ok(entry.includes('project!=="taipei-cultural-adventure"'));
 assert.ok(entry.includes('allowCandidateSubmission({stage:"stage1",data:request.data})'));
 const handler=src("functions/submission-handler.js");
 assert.ok(handler.includes("approvedLiveScope=null"),"Existing code must default to no new authorization");
 assert.ok(handler.includes("permittedByScope(approvedLiveScope,input)"));
 assert.ok(handler.includes("process.env.FIRESTORE_EMULATOR_HOST ||"),"Live candidate never runs when using Firestore emulator");
});
test("pilot client uses its own stage1 callable but remains completely off",()=>{
 const boot=src("pilot2026-cloud-bootstrap.js");
 const client=src("pilot2026-stage1-submission.js");
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
 assert.ok(boot.includes("const STAGE1_MISSION=1;"));
 assert.ok(boot.includes("submitMission:submitPilot2026Stage1"));
 assert.ok(client.includes('"submitPilot2026Stage1"'));
 assert.ok(client.includes('group?.activityId!=="pilot2026"'));
 assert.ok(client.includes('group?.groupId!=="group01"'));
 assert.ok(client.includes('Number(missionId)!==1'));
});
test("group creation is opt-in and does not contain an invitation code",()=>{
 const source=src("functions/scripts/prepare-pilot2026-stage1.mjs");
 assert.ok(source.includes('mode:"DRY_RUN_NO_WRITES"'));
 assert.ok(source.includes('env.ALLOW_PILOT2026_SEED!=="YES"'));
 assert.ok(source.includes("randomBytes(24).toString(\"hex\")"));
 assert.ok(source.includes("tx.create(groupRef"));
 assert.ok(source.includes("tx.create(inviteRef"));
 assert.ok(!/[a-f0-9]{48}/.test(source),"No hard-coded 48-character invitation code");
});
