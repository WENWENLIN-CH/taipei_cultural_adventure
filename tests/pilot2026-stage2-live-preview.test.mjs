import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const protectedPaths=[
 "index.html","script.js","firebase.json","storage.rules","functions/index.js",
 "pilot2026-cloud-bootstrap.js","functions/pilot2026-stage1-entry.js",
 "docs/storage-pilot2026-stage1-candidate.rules"
];
const original=protectedPaths.map(hash);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("build changes no existing live source or cloud rules",()=>{
 assert.deepEqual(protectedPaths.map(hash),original);
});
test("separate stage2 candidate page wires its own script and four-photo confirmation",()=>{
 const dir=".firebase-preview/";
 const html=read(dir+"pilot2026-stage2-live-quest.html");
 const js=read(dir+"pilot2026-stage2-live-quest.js");
 assert.ok(html.includes('src="pilot2026-stage2-live-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage2-live-bootstrap.js"'));
 assert.ok(html.includes("四種不同語言"));
 assert.ok(js.includes("taipeiCulturalQuestPilot2026Stage2LiveV1"));
 assert.ok(js.includes("4 張測試照片"));
 assert.ok(!js.includes("確認代表第一組提交第三關共同成果"));
});
test("stage2 bootstrap enables only group01 mission2, waits for five snapshots",()=>{
 const boot=read(".firebase-preview/pilot2026-stage2-live-bootstrap.js");
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
 assert.ok(boot.includes('const STAGE1_MISSION=2;'));
 assert.ok(boot.includes('const SUBMISSIONS_ENABLED=true;'));
 assert.ok(boot.includes("group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION"));
 assert.ok(boot.includes("!completed.has(Number(id))"));
 assert.ok(boot.includes("readyCount===5"));
 assert.ok(boot.includes("submitMission:submitPilot2026Stage2"));
 assert.ok(!boot.includes("submitPilot2026Stage1"));
 const client=read(".firebase-preview/pilot2026-stage2-submission.js");
 assert.ok(client.includes('httpsCallable(getFunctions(auth.app,"asia-east1"),"submitPilot2026Stage2")'));
 assert.ok(client.includes('group?.groupId!=="group01"'));
 assert.ok(client.includes('Number(missionId)!==2'));
});
test("other five-quest, QR, Stage1 and Stage2 review remain independent",()=>{
 const d=".firebase-preview/";
 assert.ok(read(d+"pilot2026-cloud-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(read(d+"pilot2026-stage2-review-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(read(d+"pilot2026-stage1-live-bootstrap.js").includes("const STAGE1_MISSION=1;"));
 assert.ok(read(d+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage2"));
});
