import test from "node:test";
import assert from "node:assert/strict";
import {plan,requireOptIn,createTest02Invite,GROUP_PATH} from "../functions/scripts/issue-pilot2026-test02-invite.mjs";
const args=["--apply","--project=taipei-cultural-adventure","--confirm=ISSUE_PILOT2026_GROUP01_TEST02_INVITE"];
const env={GCLOUD_PROJECT:"taipei-cultural-adventure",ALLOW_PILOT2026_TEST02:"YES"};
const token="d".repeat(48);
function fixture({member=false,invitation=false,wrongInvite=false,group=false,collision=false}={}){
 const writes=[];
 const db={
  collection(path){return {where(field,op,code){
   assert.equal(field,"studentCode");assert.equal(op,"==");assert.equal(code,"TEST02");
   return {async get(){
    if(path===GROUP_PATH+"/members")return {empty:!member};
    if(path==="invites")return {docs:invitation?[{data:()=>({
     activityId:wrongInvite?"other":"pilot2026",groupId:"group01"
    })}]:[]};
    throw Error("Unexpected collection "+path);
   }};
  }};},
  doc(path){return {path};},
  async runTransaction(fn){
   return fn({async get(ref){
    if(ref.path===GROUP_PATH)return {exists:!group,data:()=>({pilot:true})};
    if(ref.path==="invites/"+token)return {exists:collision};
    throw Error("Unexpected read "+ref.path);
   },create(ref,value){writes.push({path:ref.path,value});}});
  }
 };
 return {db,writes};
}
test("dry-run does not require credentials and only describes one invite",()=>{
 const x=plan();assert.equal(x.mode,"DRY_RUN_NO_WRITES");
 assert.equal(x.groupPath,GROUP_PATH);
 assert.match(x.writes,/ONE NEW INVITATION/);
});
test("apply must be exact and not mixed with emulator environment",()=>{
 assert.equal(requireOptIn(args,env),true);
 for(const [a,e] of [[[],env],[args,{...env,GCLOUD_PROJECT:"wrong"}],
  [args,{...env,ALLOW_PILOT2026_TEST02:"NO"}],
  [args,{...env,FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"}]])
  assert.throws(()=>requireOptIn(a,e));
});
test("success writes only unused one-time invite for TEST02",async()=>{
 const {db,writes}=fixture();
 const result=await createTest02Invite({db,token,serverTimestamp:()=>99});
 assert.equal(result.studentCode,"TEST02");
 assert.deepEqual(writes,[{
  path:"invites/"+token,
  value:{activityId:"pilot2026",groupId:"group01",studentCode:"TEST02",
   claimedBy:null,createdAt:99,purpose:"qr-pilot-test"}
 }]);
});
test("duplicates, missing group and token collisions refuse without writes",async()=>{
 for(const options of [{member:true},{invitation:true},{group:true},{collision:true}]){
  const {db,writes}=fixture(options);
  await assert.rejects(createTest02Invite({db,token,serverTimestamp:()=>99}));
  assert.equal(writes.length,0);
 }
 const {db,writes}=fixture();
 await assert.rejects(createTest02Invite({db,token:"bad",serverTimestamp:()=>99}));
 assert.equal(writes.length,0);
});
test("unrelated activity invitation does not block pilot2026 test",async()=>{
 const {db,writes}=fixture({invitation:true,wrongInvite:true});
 await createTest02Invite({db,token,serverTimestamp:()=>99});
 assert.equal(writes.length,1);
});
