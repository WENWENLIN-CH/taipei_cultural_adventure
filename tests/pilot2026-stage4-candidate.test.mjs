import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {PILOT2026_STAGE4,allowStage4Candidate} from "../functions/pilot2026-stage4-authorization.js";
import {validateGroupPayload} from "../functions/submission-core.js";
import {validateSubmission} from "../mission-schema.js";
import {FORM_SPEC} from "../mission-form-adapter.js";
const read=p=>readFileSync(p,"utf8");
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const protectedPaths=["index.html","script.js","firebase.json","storage.rules","functions/index.js",
 "pilot2026-cloud-bootstrap.js","functions/pilot2026-stage1-entry.js",
 "functions/pilot2026-stage2-entry.js","functions/pilot2026-stage3-entry.js","teacher-dashboard.js"];
const before=protectedPaths.map(hash);
const answers={
 c1_continent:"亞洲",c1_country:"日本",c1_restaurant:"日本料理測試",
 c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"義大利料理測試",
 c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"摩洛哥料理測試"
};
const prefix="activities/pilot2026/groups/group01/missions/4/test02/";
const photos=Object.fromEntries([1,2,3].map(i=>[`c${i}_photo`,prefix+`c${i}_photo.jpg`]));
test("Stage4 authorization allows only group01 mission4",()=>{
 assert.deepEqual(PILOT2026_STAGE4.groups,["group01"]);
 assert.deepEqual(PILOT2026_STAGE4.missions,[4]);
 assert.equal(allowStage4Candidate({activityId:"pilot2026",groupId:"group01",missionId:4}),true);
 for(const [activityId,groupId,missionId] of [
  ["pilot2026","group01",1],["pilot2026","group01",2],["pilot2026","group01",3],
  ["pilot2026","group01",5],["pilot2026","group02",4],["demo2026","group01",4]
 ])assert.equal(allowStage4Candidate({activityId,groupId,missionId}),false);
});
test("Stage4 schema validates three distinct continents, nine fields and exactly three photos",()=>{
 assert.deepEqual(FORM_SPEC[4].photoKeys,["c1_photo","c2_photo","c3_photo"]);
 assert.equal(FORM_SPEC[4].answerKeys.length,9);
 assert.equal(validateSubmission(4,answers,photos),true);
 const payload={activityId:"pilot2026",groupId:"group01",missionId:4,answers,photoPaths:photos};
 assert.equal(validateGroupPayload(payload).missionId,4);
 assert.throws(()=>validateGroupPayload({...payload,answers:{...answers,c3_continent:"亞洲"}}),/不同洲/);
 assert.throws(()=>validateSubmission(4,{...answers,c3_continent:"亞洲"},photos),/不同洲/);
 assert.throws(()=>validateGroupPayload({...payload,answers:{...answers,c3_country:""}}),/餐廳/);
 assert.throws(()=>validateSubmission(4,answers,{c1_photo:photos.c1_photo,c2_photo:photos.c2_photo}));
 assert.throws(()=>validateGroupPayload({...payload,photoPaths:{...photos,photo4:prefix+"photo4.jpg"}}));
});
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("Stage4 mobile preview is strictly read-only and uses separate drafts",()=>{
 const dir=".firebase-preview/";
 const html=read(dir+"pilot2026-stage4-review.html");
 const js=read(dir+"pilot2026-stage4-review-quest.js");
 const boot=read(dir+"pilot2026-stage4-review-bootstrap.js");
 assert.ok(html.includes("第四關 環遊世界美食家"));
 assert.ok(html.includes("三個不同洲"));
 assert.ok(html.includes('src="pilot2026-stage4-review-quest.js"'));
 assert.ok(html.includes('src="pilot2026-stage4-review-bootstrap.js"'));
 assert.ok(js.includes("taipeiCulturalQuestPilot2026Stage4ReviewV1"));
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
 assert.ok(boot.includes("watchGroupMissions(g,"));
 assert.ok(!boot.includes("submitPilot2026Stage4"));
});
test("Stages1-3, QR, teacher and original website preserved unchanged",()=>{
 const dir=".firebase-preview/";
 assert.deepEqual(protectedPaths.map(hash),before);
 assert.ok(read(dir+"pilot2026-stage1-live-bootstrap.js").includes("const STAGE1_MISSION=1;"));
 assert.ok(read(dir+"pilot2026-stage2-live-bootstrap.js").includes("const STAGE1_MISSION=2;"));
 assert.ok(read(dir+"pilot2026-stage3-live-bootstrap.js").includes("const STAGE1_MISSION=3;"));
 assert.ok(read(dir+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(read(dir+"teacher-dashboard.js").includes("環遊世界美食家"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage4"));
});
