import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {PILOT2026_STAGE3,allowStage3Candidate} from "../functions/pilot2026-stage3-authorization.js";
import {validateGroupPayload} from "../functions/submission-core.js";
import {validateSubmission} from "../mission-schema.js";
import {FORM_SPEC} from "../mission-form-adapter.js";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const fixed=["index.html","script.js","pilot2026-cloud-bootstrap.js","functions/index.js","firebase.json","storage.rules","functions/pilot2026-stage1-entry.js","functions/pilot2026-stage2-entry.js"];
const before=fixed.map(hash);
const paths={photo1:"activities/pilot2026/groups/group01/missions/3/test02/photo1.jpg",photo2:"activities/pilot2026/groups/group01/missions/3/test02/photo2.jpg"};
const answers={restaurant:"清真餐廳測試"};
test("Stage3 authorization is exclusive to group01 mission3",()=>{
 assert.deepEqual(PILOT2026_STAGE3.groups,["group01"]);
 assert.deepEqual(PILOT2026_STAGE3.missions,[3]);
 assert.equal(allowStage3Candidate({activityId:"pilot2026",groupId:"group01",missionId:3}),true);
 for(const [activityId,groupId,missionId] of [
  ["pilot2026","group01",1],["pilot2026","group01",2],
  ["pilot2026","group01",4],["pilot2026","group01",5],
  ["pilot2026","group02",3],["demo2026","group01",3]
 ])assert.equal(allowStage3Candidate({activityId,groupId,missionId}),false);
});
test("Stage3 contract requires restaurant and EXACTLY two photo slots",()=>{
 assert.deepEqual(FORM_SPEC[3].photoKeys,["photo1","photo2"]);
 assert.deepEqual(FORM_SPEC[3].answerKeys,["restaurant"]);
 assert.equal(validateSubmission(3,answers,paths),true);
 const payload={activityId:"pilot2026",groupId:"group01",missionId:3,answers,photoPaths:paths};
 assert.equal(validateGroupPayload(payload).missionId,3);
 assert.throws(()=>validateSubmission(3,{restaurant:""},paths));
 assert.throws(()=>validateGroupPayload({...payload,photoPaths:{photo1:paths.photo1}}));
 assert.throws(()=>validateSubmission(3,answers,{...paths,photo3:paths.photo1}));
});
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("Stage3 isolated review is read-only, shows two photo task, uses separate drafts",()=>{
 const d=".firebase-preview/";
 const html=read(d+"pilot2026-stage3-review.html");
 const js=read(d+"pilot2026-stage3-review-quest.js");
 const boot=read(d+"pilot2026-stage3-review-bootstrap.js");
 assert.ok(html.includes("Halal 大搜查")&&html.includes("兩張測試照片"));
 assert.ok(html.includes('src="pilot2026-stage3-review-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage3-review-bootstrap.js"'));
 assert.ok(js.includes("taipeiCulturalQuestPilot2026Stage3ReviewV1"));
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(boot.includes("watchGroupMissions(g,"));
 assert.ok(!boot.includes("submitPilot2026Stage3"));
});
test("existing first two missions, QR, teacher and live config untouched",()=>{
 const d=".firebase-preview/";
 assert.deepEqual(fixed.map(hash),before);
 assert.ok(read(d+"pilot2026-stage1-live-bootstrap.js").includes("const SUBMISSIONS_ENABLED=true;"));
 assert.ok(read(d+"pilot2026-stage2-live-bootstrap.js").includes("const STAGE1_MISSION=2;"));
 assert.ok(read(d+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite"));
 assert.ok(read(d+"teacher-dashboard.js").includes("Halal"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage3"));
});
