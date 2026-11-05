import test from "node:test";
import assert from "node:assert/strict";
import {PHASE2_SERVER_CANDIDATE,allowPhase2Submission} from "../functions/phase2-authorization.js";
import {requirePhase2Prerequisites} from "../functions/phase2-prerequisite.js";
const makeError=(code,message)=>Object.assign(new Error(message),{code});
function fixture({group="group02",mission=3,member=true,revoked=false,prior=true,priorStatus="completed"}={}){
 const base=`activities/phase2sandbox/groups/${group}`;
 const paths=[];
 const db={doc(path){
  paths.push(path);
  return {async get(){
   if(path===base+"/members/u2")return {exists:member,data:()=>({revoked})};
   if(path===base+`/missions/${mission-1}`)return {exists:prior,data:()=>({status:priorStatus})};
   throw Error("Unexpected read "+path);
  }};
 }};
 return {db,paths,data:{activityId:"phase2sandbox",groupId:group,missionId:mission}};
}
const check=(f,overrides={})=>requirePhase2Prerequisites({
 db:f.db,data:f.data,uid:"u2",anonymous:true,makeError,...overrides
});
test("Only the three sandbox groups and five missions are in candidate server allowlist",()=>{
 assert.equal(Object.isFrozen(PHASE2_SERVER_CANDIDATE),true);
 for(const groupId of PHASE2_SERVER_CANDIDATE.groups)
  for(let missionId=1;missionId<=5;missionId++)
   assert.equal(allowPhase2Submission({activityId:"phase2sandbox",groupId,missionId}),true);
 for(const wrong of [
  {activityId:"pilot2026",groupId:"group01",missionId:1},
  {activityId:"demo2026",groupId:"group01",missionId:1},
  {activityId:"phase2sandbox",groupId:"group04",missionId:1},
  {activityId:"phase2sandbox",groupId:"group01",missionId:6}
 ])assert.equal(allowPhase2Submission(wrong),false);
});
test("Reject wrong activity before any Firestore reads",async()=>{
 const f=fixture();
 await assert.rejects(check(f,{data:{...f.data,activityId:"pilot2026"}}),{code:"permission-denied"});
 assert.deepEqual(f.paths,[]);
});
test("Reject missing anonymous identity before any Firestore reads",async()=>{
 const f=fixture();
 await assert.rejects(check(f,{anonymous:false}),{code:"unauthenticated"});
 await assert.rejects(check(f,{uid:""}),{code:"unauthenticated"});
 assert.deepEqual(f.paths,[]);
});
test("Reject nonmembers and revoked group members",async()=>{
 for(const opts of [{member:false},{revoked:true}]){
  const f=fixture(opts);
  await assert.rejects(check(f),{code:"permission-denied"});
 }
});
test("Mission 1 requires membership but not a prior mission",async()=>{
 const f=fixture({mission:1});
 assert.equal(await check(f),true);
 assert.deepEqual(f.paths,["activities/phase2sandbox/groups/group02/members/u2"]);
});
test("Missions 2–5 require the previous group mission completed",async()=>{
 for(let mission=2;mission<=5;mission++){
  for(const opts of [{prior:false},{priorStatus:"pending"}]){
   const f=fixture({mission,...opts});
   await assert.rejects(check(f),{code:"failed-precondition"});
  }
  const f=fixture({mission});
  assert.equal(await check(f),true);
  assert.deepEqual(f.paths,[
   "activities/phase2sandbox/groups/group02/members/u2",
   `activities/phase2sandbox/groups/group02/missions/${mission-1}`
  ]);
 }
});
