import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=p=>readFileSync(p,"utf8");
const sha=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const protectedFiles=["index.html","script.js","pilot2026-cloud-bootstrap.js","functions/index.js","firebase.json","storage.rules"];
const before=protectedFiles.map(sha);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
const dir=".firebase-preview/";
test("production, legacy client, and read-only bootstrap are unchanged",()=>{
 assert.deepEqual(protectedFiles.map(sha),before);
 assert.ok(read(dir+"pilot2026-cloud-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(read(dir+"cloud-quest-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
});
test("separate stage1 page uses separate code and local draft key",()=>{
 const html=read(dir+"pilot2026-stage1-live-quest.html");
 const js=read(dir+"pilot2026-stage1-live-quest.js");
 assert.ok(html.includes('src="pilot2026-stage1-live-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage1-live-bootstrap.js"'));
 assert.ok(!html.includes('src="pilot2026-cloud-bootstrap.js"'));
 assert.ok(html.includes("只用非個資的測試照片"));
 assert.ok(js.includes('taipeiCulturalQuestPilot2026Stage1LiveV1'));
 assert.ok(!js.includes("確認代表第一組提交第三關共同成果"));
 assert.ok(js.includes("將上傳 1 張測試照片"));
 assert.ok(js.includes("cloudQuestMaySubmit?.(m.id)"));
});
test("live stage1 bootstrap strictly limits submission to group01 mission1",()=>{
 const boot=read(dir+"pilot2026-stage1-live-bootstrap.js");
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=true;"));
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
 assert.ok(boot.includes("const STAGE1_MISSION=1;"));
 assert.ok(boot.includes("group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION"));
 assert.ok(boot.includes("readyCount===5"));
 assert.ok(boot.includes("submitMission:submitPilot2026Stage1"));
 assert.ok(!boot.includes("模式：待啟用，不接受雲端提交"));
});
test("existing callable stays scoped and pilot2026 backend code is separate",()=>{
 const existing=read("functions/index.js");
 assert.ok(existing.includes('request.data?.activityId!=="demo2026"'));
 assert.ok(existing.includes('Number(request.data?.missionId)!==3'));
 const entry=read("functions/pilot2026-stage1-entry.js");
 assert.ok(entry.includes("approvedLiveScope:PILOT2026_STAGE1"));
 assert.ok(entry.includes('allowCandidateSubmission({stage:"stage1",data:request.data})'));
});
