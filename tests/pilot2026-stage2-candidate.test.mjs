import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PILOT2026_STAGE2,allowStage2Candidate} from "../functions/pilot2026-stage2-authorization.js";
import {validateGroupPayload} from "../functions/submission-core.js";
import {validateSubmission} from "../mission-schema.js";
const read=p=>readFileSync(p,"utf8");
const answers={lang1_lang:"韓文",lang2_lang:"英文",lang3_lang:"泰文",lang4_lang:"越南文"};
const photoPaths=Object.fromEntries([1,2,3,4].map(i=>[
 `lang${i}_photo`,`activities/pilot2026/groups/group01/missions/2/UID/lang${i}_photo.jpg`
]));
test("Stage2 allowlist excludes all other groups, activities and missions",()=>{
 assert.deepEqual(PILOT2026_STAGE2.missions,[2]);
 assert.deepEqual(PILOT2026_STAGE2.groups,["group01"]);
 assert.ok(allowStage2Candidate({activityId:"pilot2026",groupId:"group01",missionId:2}));
 for(const [activityId,groupId,missionId] of [
  ["pilot2026","group01",1],["pilot2026","group01",3],
  ["pilot2026","group02",2],["demo2026","group01",2]
 ])assert.equal(allowStage2Candidate({activityId,groupId,missionId}),false);
});
test("four distinct language answers and four photo keys are mandatory",()=>{
 const data={activityId:"pilot2026",groupId:"group01",missionId:2,answers,photoPaths};
 assert.equal(validateGroupPayload(data).missionId,2);
 assert.equal(validateSubmission(2,answers,photoPaths),true);
 assert.throws(()=>validateGroupPayload({...data,answers:{...answers,lang4_lang:"韓文"}}));
 assert.throws(()=>validateSubmission(2,{...answers,lang4_lang:"韓文"},photoPaths));
 assert.throws(()=>validateGroupPayload({...data,photoPaths:{lang1_photo:photoPaths.lang1_photo}}));
 assert.throws(()=>validateSubmission(2,answers,{lang1_photo:photoPaths.lang1_photo}));
});
test("new candidate is isolated from existing callable and Stage1",()=>{
 const index=read("functions/index.js");
 const stage1=read("functions/pilot2026-stage1-entry.js");
 const stage2=read("functions/pilot2026-stage2-entry.js");
 assert.ok(!index.includes("submitPilot2026Stage2"));
 assert.ok(stage1.includes("approvedLiveScope:PILOT2026_STAGE1"));
 assert.ok(stage2.includes("approvedLiveScope:PILOT2026_STAGE2"));
 assert.ok(stage2.includes("allowStage2Candidate(request.data)"));
 assert.ok(!read("pilot2026-cloud-bootstrap.js").includes("submitPilot2026Stage2"));
});
