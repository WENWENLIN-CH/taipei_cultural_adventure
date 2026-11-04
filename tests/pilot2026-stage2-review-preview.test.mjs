import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const untouched=["index.html","script.js","pilot2026-cloud-bootstrap.js","functions/index.js","firebase.json","storage.rules"];
const before=untouched.map(hash);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
const dir=".firebase-preview/";
test("Stage2 review has separate page, script, bootstrap and local drafts",()=>{
 const html=read(dir+"pilot2026-stage2-review.html");
 const js=read(dir+"pilot2026-stage2-review-quest.js");
 assert.ok(html.includes('src="pilot2026-stage2-review-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage2-review-bootstrap.js"'));
 assert.ok(html.includes("異國文字解密"));
 assert.ok(html.includes("四張照片"));
 assert.ok(js.includes("taipeiCulturalQuestPilot2026Stage2ReviewV1"));
 assert.ok(!js.includes("taipeiCulturalQuestPilot2026CloudV1"));
});
test("Stage2 review preserves live mission progress without allowing uploads",()=>{
 const boot=read(dir+"pilot2026-stage2-review-bootstrap.js");
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(boot.includes("watchGroupMissions(g,"));
 assert.ok(boot.includes("window.cloudQuestMaySubmit=id=>SUBMISSIONS_ENABLED &&"));
 assert.ok(!boot.includes("submitPilot2026Stage2"));
 assert.ok(!boot.includes("const SUBMISSIONS_ENABLED=true;"));
});
test("existing first-stage and QR scan preview remain functional and unchanged",()=>{
 assert.deepEqual(untouched.map(hash),before);
 assert.ok(read(dir+"pilot2026-stage1-live-bootstrap.js").includes("const SUBMISSIONS_ENABLED=true;"));
 assert.ok(read(dir+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite"));
 assert.ok(read(dir+"pilot2026-cloud-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage2"));
});
