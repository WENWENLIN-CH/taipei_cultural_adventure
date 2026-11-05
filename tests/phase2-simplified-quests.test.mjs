import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {FORM_SPEC,extractMissionForm} from "../mission-form-adapter.js";
import {REQUIRED_PHOTO_KEYS,validateSubmission} from "../mission-schema.js";
import {validateGroupPayload} from "../functions/submission-core.js";
const photos=n=>Object.fromEntries(REQUIRED_PHOTO_KEYS[n].map(k=>[
 k,`activities/taipei2026rehearsal/groups/group01/missions/${n}/testUid/${k}.jpg`
]));
const formPhotos=n=>Object.fromEntries(REQUIRED_PHOTO_KEYS[n].map(k=>[k,"data:image/jpeg;base64,/9j/"]));
test("Third quest needs two photos and NO restaurant name",()=>{
 assert.deepEqual(FORM_SPEC[3].answerKeys,[]);
 const form={...formPhotos(3),safetyCheck:true};
 assert.deepEqual(extractMissionForm(3,form).answers,{});
 assert.equal(validateSubmission(3,{},photos(3)),true);
 assert.doesNotThrow(()=>validateGroupPayload({activityId:"taipei2026rehearsal",groupId:"group01",missionId:3,answers:{},photoPaths:photos(3)}));
 assert.throws(()=>validateGroupPayload({activityId:"demo2026",groupId:"group01",missionId:3,answers:{},photoPaths:photos(3)}),/餐廳名稱/);
});
test("Fourth quest needs continents, countries and photos but NO restaurant name",()=>{
 const answers={c1_continent:"亞洲",c1_country:"台灣",c2_continent:"歐洲",c2_country:"法國",c3_continent:"非洲",c3_country:"埃及"};
 assert.equal(FORM_SPEC[4].answerKeys.length,6);
 assert.equal(FORM_SPEC[4].answerKeys.filter(x=>x.endsWith("_restaurant")).length,0);
 assert.deepEqual(extractMissionForm(4,{...answers,...formPhotos(4),safetyCheck:true}).answers,answers);
 assert.equal(validateSubmission(4,answers,photos(4)),true);
 assert.doesNotThrow(()=>validateGroupPayload({activityId:"taipei2026rehearsal",groupId:"group01",missionId:4,answers,photoPaths:photos(4)}));
 assert.throws(()=>validateGroupPayload({activityId:"demo2026",groupId:"group01",missionId:4,answers,photoPaths:photos(4)}),/餐廳|國家資料/);
});
test("Fifth quest continues to require product and origin, no restaurant names",()=>{
 assert.deepEqual(FORM_SPEC[5].answerKeys,["p1_country","p1_name","p2_country","p2_name","p3_country","p3_name"]);
});
test("Generated Phase2 student page conceals the final puzzle destination",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-student-preview.mjs"],{stdio:"pipe"});
 const html=readFileSync(".firebase-preview/phase2-student-quest.html","utf8");
 const js=readFileSync(".firebase-preview/phase2-student-quest.js","utf8");
 assert.ok(html.includes("完成五關後將開啟神秘的最終任務"));
 assert.ok(!html.includes("五關完成自動解鎖圓山"));
 assert.ok(!html.includes("酒泉街謎題"));
 assert.ok(!js.includes('data-key="${field.key}_restaurant"'));
});
