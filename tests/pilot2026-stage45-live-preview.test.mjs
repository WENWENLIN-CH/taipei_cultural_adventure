import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const sha=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const protectedFiles=[
 "index.html","script.js","firebase.json","storage.rules","functions/index.js",
 "pilot2026-cloud-bootstrap.js","teacher-dashboard.js",
 "functions/pilot2026-stage1-entry.js","functions/pilot2026-stage2-entry.js",
 "functions/pilot2026-stage3-entry.js","pilot2026-stage3-submission.js",
 "docs/storage-pilot2026-stage3-candidate.rules"
];
const before=protectedFiles.map(sha);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("Combined Stage4/5 live candidate build never changes legacy student or teacher source",()=>{
 assert.deepEqual(protectedFiles.map(sha),before);
});
test("Stage4/5 each use distinct reviewed forms, drafts, and three-photo confirmation",()=>{
 const d=".firebase-preview/";
 for(const [n,title,phrase] of [[4,"環遊世界美食家","三個不同洲餐廳資料及 3 張測試照片"],[5,"揭秘南洋商店","三個不同國家商品及 3 張測試照片"]]){
  const html=read(d+`pilot2026-stage${n}-live-quest.html`);
  const js=read(d+`pilot2026-stage${n}-live-quest.js`);
  assert.ok(html.includes(title));
  assert.ok(html.includes(`src="pilot2026-stage${n}-live-quest.js"`));
  assert.ok(html.includes(`src="pilot2026-stage${n}-live-bootstrap.js"`));
  assert.ok(js.includes(`taipeiCulturalQuestPilot2026Stage${n}LiveV1`));
  assert.ok(js.includes(phrase));
  assert.ok(js.includes("dataset.missionId = String(m.id)"));
  assert.ok(!js.includes("第三關的餐廳名稱及 2 張測試照片"));
  assert.ok(read(d+`pilot2026-stage${n}-review-bootstrap.js`).includes("const SUBMISSIONS_ENABLED=false;"));
 }
});
test("Stage4/5 callable and buttons are limited to group01, respective mission and prior completion",()=>{
 const d=".firebase-preview/";
 for(const [n,prior] of [[4,3],[5,4]]){
  const boot=read(d+`pilot2026-stage${n}-live-bootstrap.js`);
  const client=read(d+`pilot2026-stage${n}-submission.js`);
  assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
  assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
  assert.ok(boot.includes(`const STAGE1_MISSION=${n};`));
  assert.ok(boot.includes("const SUBMISSIONS_ENABLED=true;"));
  assert.ok(boot.includes(`completed.has(${prior})`));
  assert.ok(boot.includes("!completed.has(Number(id))"));
  assert.ok(boot.includes("readyCount===5"));
  assert.ok(boot.includes("group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION"));
  assert.ok(boot.includes(`submitMission:submitPilot2026Stage${n}`));
  assert.ok(boot.includes(`function refreshStage${n}Button(){`));
  assert.ok(boot.includes(`refreshStage${n}Button();`));
  assert.ok(boot.includes("btn.disabled=!eligible"));
  for(const other of [1,2,3,4,5].filter(x=>x!==n))
   assert.ok(!boot.includes(`submitPilot2026Stage${other}`));
  assert.ok(client.includes(`"submitPilot2026Stage${n}"`));
  assert.ok(client.includes('group?.groupId!=="group01"'));
  assert.ok(client.includes(`Number(missionId)!==${n}`));
  assert.ok(client.includes(`validateSubmission(${n},answers,photoPaths)`));
 }
});
test("The final puzzle remains Firestore 5/5 gated; QR and the first three stages are intact",()=>{
 const d=".firebase-preview/";
 const js=read(d+"pilot2026-stage5-live-quest.js");
 assert.ok(js.includes("return doneCount()===5;"));
 assert.ok(js.includes("window.cloudQuestCompleted?.(m.id)"));
 assert.ok(!js.includes("return doneCount()===5 || state.teacherUnlocked;"));
 assert.ok(read(d+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(read(d+"teacher-dashboard.js").includes("揭秘南洋商店"));
 for(const n of [1,2,3]){
  assert.ok(read(d+`pilot2026-stage${n}-live-bootstrap.js`).includes(`const STAGE1_MISSION=${n};`));
 }
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage4"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage5"));
});
