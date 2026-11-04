import test from "node:test";
import assert from "node:assert/strict";
import {CURRENT_LIVE_PILOT,PROPOSED_ISOLATED_PILOT,permittedByScope,permittedInEnvironment} from "../pilot-scope.js";
const payload=(activityId,groupId,missionId)=>({activityId,groupId,missionId});
test("live pilot allows only existing demo group01 mission3",()=>{
 for(const id of [1,2,3,4,5]){
  for(const group of ["group01","group02","group03"]){
   const data=payload("demo2026",group,id);
   assert.equal(permittedByScope(CURRENT_LIVE_PILOT,data),id===3&&group==="group01");
   assert.equal(permittedInEnvironment({isEmulator:false,scope:PROPOSED_ISOLATED_PILOT,data}),id===3&&group==="group01");
  }
 }
});
test("proposed scope names exactly three pilot groups and five missions",()=>{
 assert.deepEqual([...PROPOSED_ISOLATED_PILOT.groups],["group01","group02","group03"]);
 assert.deepEqual([...PROPOSED_ISOLATED_PILOT.missions],[1,2,3,4,5]);
 for(const group of PROPOSED_ISOLATED_PILOT.groups)
  for(const id of PROPOSED_ISOLATED_PILOT.missions)
   assert.equal(permittedByScope(PROPOSED_ISOLATED_PILOT,payload("pilot2026",group,id)),true);
});
test("all other activities, groups and mission identifiers are denied",()=>{
 for(const activity of ["demo2026","pilot2027","pilot2026extra","",null])
  assert.equal(permittedByScope(PROPOSED_ISOLATED_PILOT,payload(activity,"group01",3)),false);
 for(const group of ["group00","group04","group99","","../group01"])
  assert.equal(permittedByScope(PROPOSED_ISOLATED_PILOT,payload("pilot2026",group,3)),false);
 for(const mission of [0,6,-1,3.3,"3",null])
  assert.equal(permittedByScope(PROPOSED_ISOLATED_PILOT,payload("pilot2026","group01",mission)),false);
 for(const invalid of [null,{},[],{activityId:"pilot2026"}])
  assert.equal(permittedByScope(PROPOSED_ISOLATED_PILOT,invalid),false);
});
test("the new pilot scope cannot be activated in non-emulator mode",()=>{
 assert.equal(permittedInEnvironment({isEmulator:false,scope:PROPOSED_ISOLATED_PILOT,data:payload("pilot2026","group01",1)}),false);
 assert.equal(permittedInEnvironment({isEmulator:true,scope:PROPOSED_ISOLATED_PILOT,data:payload("pilot2026","group01",1)}),true);
 assert.equal(permittedInEnvironment({isEmulator:false,scope:CURRENT_LIVE_PILOT,data:payload("demo2026","group01",3)}),true);
});
test("policy objects cannot be casually mutated at runtime",()=>{
 assert.equal(Object.isFrozen(PROPOSED_ISOLATED_PILOT),true);
 assert.equal(Object.isFrozen(PROPOSED_ISOLATED_PILOT.groups),true);
 assert.equal(Object.isFrozen(PROPOSED_ISOLATED_PILOT.missions),true);
});
