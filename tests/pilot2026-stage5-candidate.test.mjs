import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {PILOT2026_STAGE5,allowStage5Candidate} from "../functions/pilot2026-stage5-authorization.js";
import {validateGroupPayload} from "../functions/submission-core.js";
import {validateSubmission} from "../mission-schema.js";
import {FORM_SPEC} from "../mission-form-adapter.js";
const read=p=>readFileSync(p,"utf8");
const sha=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const protectedPaths=["index.html","script.js","firebase.json","storage.rules","functions/index.js",
 "pilot2026-cloud-bootstrap.js","functions/pilot2026-stage1-entry.js",
 "functions/pilot2026-stage2-entry.js","functions/pilot2026-stage3-entry.js","teacher-dashboard.js"];
const before=protectedPaths.map(sha);
const answers={
 p1_country:"菲律賓",p1_name:"測試零食1",
 p2_country:"印尼",p2_name:"測試零食2",
 p3_country:"越南",p3_name:"測試零食3"
};
const prefix="activities/pilot2026/groups/group01/missions/5/test02/";
const photos=Object.fromEntries([1,2,3].map(i=>[`p${i}_photo`,prefix+`p${i}_photo.jpg`]));
test("Stage5 authorization restricts to pilot2026 group01 mission5 only",()=>{
 assert.deepEqual(PILOT2026_STAGE5.groups,["group01"]);
 assert.deepEqual(PILOT2026_STAGE5.missions,[5]);
 assert.equal(allowStage5Candidate({activityId:"pilot2026",groupId:"group01",missionId:5}),true);
 for(const [activityId,groupId,missionId] of [
  ["pilot2026","group01",1],["pilot2026","group01",2],["pilot2026","group01",3],
  ["pilot2026","group01",4],["pilot2026","group02",5],["demo2026","group01",5]
 ])assert.equal(allowStage5Candidate({activityId,groupId,missionId}),false);
});
test("Stage5 requires three different countries, six text fields and three JPEG paths",()=>{
 assert.deepEqual(FORM_SPEC[5].photoKeys,["p1_photo","p2_photo","p3_photo"]);
 assert.equal(FORM_SPEC[5].answerKeys.length,6);
 assert.equal(validateSubmission(5,answers,photos),true);
 const payload={activityId:"pilot2026",groupId:"group01",missionId:5,answers,photoPaths:photos};
 assert.equal(validateGroupPayload(payload).missionId,5);
 assert.throws(()=>validateGroupPayload({...payload,answers:{...answers,p3_country:"菲律賓"}}),/不同國家/);
 assert.throws(()=>validateSubmission(5,{...answers,p3_country:"菲律賓"},photos),/不同國家/);
 assert.throws(()=>validateGroupPayload({...payload,answers:{...answers,p2_name:""}}),/商品名稱/);
 assert.throws(()=>validateGroupPayload({...payload,photoPaths:{p1_photo:photos.p1_photo,p2_photo:photos.p2_photo}}));
 assert.throws(()=>validateSubmission(5,answers,{...photos,p4_photo:photos.p3_photo}));
});
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
test("Stage4 and Stage5 mobile forms are isolated and submissions stay disabled",()=>{
 const d=".firebase-preview/";
 const fourth=read(d+"pilot2026-stage4-review.html");
 const fifth=read(d+"pilot2026-stage5-review.html");
 assert.ok(fourth.includes("三個不同洲"));
 assert.ok(fifth.includes("三個不同國家"));
 assert.ok(fifth.includes('src="pilot2026-stage5-review-quest.js"'));
 assert.ok(fifth.includes('src="pilot2026-stage5-review-bootstrap.js"'));
 assert.ok(read(d+"pilot2026-stage4-review-quest.js").includes("taipeiCulturalQuestPilot2026Stage4ReviewV1"));
 assert.ok(read(d+"pilot2026-stage5-review-quest.js").includes("taipeiCulturalQuestPilot2026Stage5ReviewV1"));
 for(const n of [4,5]){
  const boot=read(d+`pilot2026-stage${n}-review-bootstrap.js`);
  assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
  assert.ok(boot.includes("watchGroupMissions(g,"));
  assert.ok(!boot.includes("submitPilot2026Stage"+n));
 }
});
test("Stages1-3, original QR join and teacher pages remain unchanged",()=>{
 const d=".firebase-preview/";
 assert.deepEqual(protectedPaths.map(sha),before);
 assert.ok(read(d+"pilot2026-stage1-live-bootstrap.js").includes("const STAGE1_MISSION=1;"));
 assert.ok(read(d+"pilot2026-stage2-live-bootstrap.js").includes("const STAGE1_MISSION=2;"));
 assert.ok(read(d+"pilot2026-stage3-live-bootstrap.js").includes("const STAGE1_MISSION=3;"));
 assert.ok(read(d+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(read(d+"teacher-dashboard.js").includes("揭秘南洋商店"));
 assert.ok(!read("functions/index.js").includes("submitPilot2026Stage5"));
});
