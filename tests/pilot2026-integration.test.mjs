import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const originals=[hash("index.html"),hash("script.js"),hash("cloud-quest-bootstrap.js"),hash("functions/index.js")];
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("original live site and callable entrypoint are untouched by build",()=>{
 assert.deepEqual([hash("index.html"),hash("script.js"),hash("cloud-quest-bootstrap.js"),hash("functions/index.js")],originals);
});
const dir=".firebase-preview/";
const pilotHtml=read(dir+"pilot2026-cloud-quest.html"),pilotJs=read(dir+"pilot2026-cloud-quest.js");
const boot=read(dir+"pilot2026-cloud-bootstrap.js");
const teacherHtml=read(dir+"teacher-dashboard.html"),teacherJS=read(dir+"teacher-dashboard.js");
test("pilot2026 page uses its own JS, bootstrap and local storage",()=>{
 assert.ok(pilotHtml.includes('src="pilot2026-cloud-quest.js"'));
 assert.ok(pilotHtml.includes('src="pilot2026-cloud-bootstrap.js"'));
 assert.ok(!pilotHtml.includes('src="cloud-quest-bootstrap.js"'));
 assert.ok(pilotJs.includes('const STORAGE_KEY = "taipeiCulturalQuestPilot2026CloudV1";'));
 assert.ok(!pilotJs.includes("    ms.completed = true;"));
 assert.ok(pilotJs.includes("return doneCount()===5;"));
});
test("pilot2026 client strictly refuses live submission and other-activity invites",()=>{
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes('const SUBMISSIONS_ENABLED=false;'));
 assert.ok(boot.includes('ALLOWED_GROUPS.includes(invite.data().groupId)'));
 assert.ok(boot.includes('invite.data().activityId!==ACTIVITY_ID'));
 assert.ok(boot.indexOf('invite.data().activityId!==ACTIVITY_ID')<boot.indexOf('await joinByInvitation(token)'),"Reject other activity before claiming code");
 assert.ok(boot.includes('window.cloudQuestMaySubmit=id=>SUBMISSIONS_ENABLED'));
 assert.ok(boot.includes('submitOriginalMission({missionId,formData,onProgress:notice})'));
 assert.ok(boot.includes('readyCount===5'));
});
test("teacher can select either activity in read-only interface",()=>{
 assert.ok(teacherHtml.includes('id="activitySelector"'));
 assert.ok(teacherHtml.includes('<option value="demo2026">'));
 assert.ok(teacherHtml.includes('<option value="pilot2026">'));
 assert.ok(teacherJS.includes('ALLOWED_ACTIVITIES=Object.freeze(["demo2026","pilot2026"])'));
 assert.ok(teacherJS.includes('activitySelector.addEventListener("change"'));
 assert.ok(teacherJS.includes('getDocs(collection(db,"activities",activityId,"groups"))'));
 assert.ok(teacherJS.includes('getBlob(ref(storage,path),2*1024*1024)'));
 assert.ok(!teacherJS.includes("setDoc("));
 assert.ok(!teacherJS.includes("writeBatch("));
});
test("old students and existing teacher dashboard still coexist",()=>{
 assert.ok(read(dir+"cloud-quest-bootstrap.js").includes('const SUBMISSIONS_ENABLED=false;'));
 assert.ok(read(dir+"cloud-quest-pilot-bootstrap.js").includes('const PILOT_MISSION=3;'));
 assert.ok(read(dir+"pilot2026-rehearsal.html").includes("不會上傳雲端"));
 assert.ok(read(dir+"five-quest.html").includes("禁止雲端提交"));
});
test("production callable is not wired to proposed stage1 allowlist",()=>{
 const index=read("functions/index.js");
 assert.ok(!index.includes("PILOT2026_STAGE1"));
 assert.ok(!index.includes("emulatorPilotScope:"));
 assert.ok(index.includes('request.data?.activityId!=="demo2026"'));
});
console.log("PASS: pilot2026 separate student page, stage1 server candidate, teacher activity selector and original pages remain isolated. BUILD ONLY, NOT DEPLOYED.");
