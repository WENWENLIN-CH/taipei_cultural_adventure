import test from "node:test";
import assert from "node:assert/strict";
import {PILOT2026_STAGE1,PILOT2026_FIVE_QUESTS,allowCandidateSubmission,allowDeployedSubmission} from "../pilot2026-authorization.js";
const input=(activityId,groupId,missionId)=>({activityId,groupId,missionId});
test("stage1 limits pilot2026 to group01 mission1",()=>{
 for(const group of ["group01","group02","group03","group04"]){
  for(let n=1;n<=5;n++)
   assert.equal(allowCandidateSubmission({data:input("pilot2026",group,n)}),group==="group01"&&n===1);
 }
});
test("five-quest expansion remains separately staged and denies other activities",()=>{
 for(const group of PILOT2026_FIVE_QUESTS.groups)
  for(const n of PILOT2026_FIVE_QUESTS.missions)
   assert.equal(allowCandidateSubmission({stage:"five-quests",data:input("pilot2026",group,n)}),true);
 for(const wrong of [input("demo2026","group01",1),input("pilot2026","group04",1),input("pilot2026","group01",6),input("pilot2026","group01","1"),null])
  assert.equal(allowCandidateSubmission({stage:"five-quests",data:wrong}),false);
 assert.equal(allowCandidateSubmission({stage:"unknown",data:input("pilot2026","group01",1)}),false);
});
test("existing deployed activity scope remains unchanged",()=>{
 for(const activity of ["pilot2026","demo2026"])
  for(const group of ["group01","group02"])
   for(const n of [1,2,3,4,5])
    assert.equal(allowDeployedSubmission(input(activity,group,n)),activity==="demo2026"&&group==="group01"&&n===3);
});
test("scopes are immutable",()=>{
 assert.ok(Object.isFrozen(PILOT2026_STAGE1));
 assert.ok(Object.isFrozen(PILOT2026_STAGE1.missions));
 assert.ok(Object.isFrozen(PILOT2026_FIVE_QUESTS.groups));
});
