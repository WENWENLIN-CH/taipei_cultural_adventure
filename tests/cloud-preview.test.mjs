import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const originalHtml=hash("index.html"),originalJS=hash("script.js");
execFileSync(process.execPath,["scripts/build-cloud-quest-preview.mjs"],{stdio:"inherit"});
assert.equal(hash("index.html"),originalHtml,"Original homepage must not change");
assert.equal(hash("script.js"),originalJS,"Original mission script must not change");
const html=read(".firebase-preview/cloud-quest.html");
const js=read(".firebase-preview/cloud-quest.js");
const boot=read(".firebase-preview/cloud-quest-bootstrap.js");
for(const token of ['id="cloudInvite"','id="cloudDashboardStatus"','src="cloud-quest.js"','src="cloud-quest-bootstrap.js"']){
 assert.ok(html.includes(token),"Missing generated UI: "+token);
}
assert.ok(js.includes('const STORAGE_KEY = "taipeiCulturalQuestCloudPreviewV1";'));
assert.ok(js.includes('window.cloudQuestCompleted?.(m.id)'),"Progress must be server-driven");
assert.ok(js.includes('document.getElementById("completeMissionBtn").disabled = true;'),"Submission button must stay disabled");
assert.ok(!js.includes("    ms.completed = true;"),"Direct local completion write must not exist");
assert.ok(js.includes("return doneCount()===5;"),"Only all five completed unlock final");
assert.ok(!js.includes("return doneCount()===5 || state.teacherUnlocked;"),"Teacher local password must not unlock cloud final");
assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"),"Preview must not accept submissions");
assert.ok(html.includes("清除本機草稿"),"Reset must be clearly local only");
console.log("Cloud Taipei Island preview build checks passed. Original student website unchanged; submissions disabled.");
