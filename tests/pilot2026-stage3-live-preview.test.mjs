import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=path=>readFileSync(path,"utf8");
const sha=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
const protectedFiles=[
 "index.html","script.js","firebase.json","storage.rules","functions/index.js",
 "pilot2026-cloud-bootstrap.js","functions/pilot2026-stage1-entry.js",
 "functions/pilot2026-stage2-entry.js","pilot2026-stage2-submission.js",
 "docs/storage-pilot2026-stage2-candidate.rules","teacher-dashboard.js"
];
const before=protectedFiles.map(sha);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("Stage3 live candidate is isolated from all existing student, backend and teacher sources",()=>{
 assert.deepEqual(protectedFiles.map(sha),before);
});
test("Stage3 candidate uses exact Halal form and independent two-photo confirmation",()=>{
 const dir=".firebase-preview/";
 const html=read(dir+"pilot2026-stage3-live-quest.html");
 const quest=read(dir+"pilot2026-stage3-live-quest.js");
 assert.ok(html.includes("第三關 Halal 大搜查"));
 assert.ok(html.includes("兩張非個資 JPEG"));
 assert.ok(html.includes('src="pilot2026-stage3-live-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage3-live-bootstrap.js"'));
 assert.ok(quest.includes("taipeiCulturalQuestPilot2026Stage3LiveV1"));
 assert.ok(quest.includes("第三關的餐廳名稱及 2 張測試照片"));
 assert.ok(quest.includes("dataset.missionId = String(m.id)"));
 assert.ok(!quest.includes("四種語言和 4 張"));
});
test("Stage3 live bootstrap only unlocks group01 mission3 after 5 Firestore snapshots",()=>{
 const boot=read(".firebase-preview/pilot2026-stage3-live-bootstrap.js");
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
 assert.ok(boot.includes("const STAGE1_MISSION=3;"));
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=true;"));
 assert.ok(boot.includes("group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION"));
 assert.ok(boot.includes("!completed.has(Number(id))"));
 assert.ok(boot.includes("readyCount===5"));
 assert.ok(boot.includes("function refreshStage3Button(){"));
 assert.ok(boot.includes("refreshStage3Button();"));
 assert.ok(boot.includes("btn.disabled=!eligible"));
 assert.ok(boot.includes("submitMission:submitPilot2026Stage3"));
 assert.ok(!boot.includes("submitPilot2026Stage2"));
 assert.ok(!boot.includes("submitPilot2026Stage1"));
});
test("Stage3 isolated callable targets stage3 and group01, never other activities or missions",()=>{
 const client=read(".firebase-preview/pilot2026-stage3-submission.js");
 assert.ok(client.includes('httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage3")'));
 assert.ok(client.includes('group?.groupId!=="group01"'));
 assert.ok(client.includes('Number(missionId)!==3'));
 assert.ok(client.includes("validateSubmission(3,answers,photoPaths)"));
});
test("Stage3 review, Stages1-2, QR join, teacher page and other missions retain their scope",()=>{
 const d=".firebase-preview/";
 assert.ok(read(d+"pilot2026-stage3-review-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(!read(d+"pilot2026-stage3-review-bootstrap.js").includes("submitPilot2026Stage3"));
 assert.ok(read(d+"pilot2026-stage2-live-bootstrap.js").includes("const STAGE1_MISSION=2;"));
 assert.ok(read(d+"pilot2026-stage1-live-bootstrap.js").includes("const STAGE1_MISSION=1;"));
 assert.ok(read(d+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage3"));
});
