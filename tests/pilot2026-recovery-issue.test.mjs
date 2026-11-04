import test from "node:test";
import assert from "node:assert/strict";
import {plan,verifyApproval,issueRecovery,GROUP_PATH} from "../functions/scripts/issue-pilot2026-recovery.mjs";
const args=["--apply","--project=taipei-cultural-adventure","--confirm=ISSUE_PILOT2026_GROUP01_TEST01_RECOVERY"];
const env={ALLOW_PILOT2026_RECOVERY:"YES",GCLOUD_PROJECT:"taipei-cultural-adventure"};
const token="b".repeat(48);
function fake({hasMember=true,revoked=false,hasGroup=true,existingInvite=false}={}){
 const writes=[],reads=[];
 const db={
  doc(path){
   return {path,async get(){
    reads.push(path);
    if(path===GROUP_PATH)return {exists:hasGroup,data:()=>({pilot:true})};
    throw Error("Unexpected direct doc.get "+path);
   }};
  },
  collection(path){
   assert.equal(path,GROUP_PATH+"/members");
   return {where(field,op,code){
    assert.deepEqual([field,op,code],["studentCode","==","TEST01"]);
    return {async get(){return {
     empty:!hasMember,
     docs:hasMember?[{data:()=>({studentCode:"TEST01",revoked})}]:[]
    };}};
   }};
  },
  async runTransaction(cb){
   return cb({
    async get(ref){reads.push(ref.path);return {exists:existingInvite};},
    create(ref,value){writes.push({path:ref.path,value});}
   });
  }
 };
 return {db,writes,reads};
}
test("recovery default is a no-write plan bound to pilot2026 group01 TEST01",()=>{
 const p=plan();
 assert.equal(p.mode,"DRY_RUN_NO_WRITES");
 assert.equal(p.originalGroup,GROUP_PATH);
 assert.equal(p.missionDocumentsWritten,0);
 assert.equal(p.previousMemberStatus,"UNCHANGED");
});
test("explicit confirmation and production project required",()=>{
 assert.equal(verifyApproval(args,env),true);
 assert.throws(()=>verifyApproval([],env));
 assert.throws(()=>verifyApproval(args,{...env,GCLOUD_PROJECT:"wrong"}));
 assert.throws(()=>verifyApproval(args,{...env,ALLOW_PILOT2026_RECOVERY:"NO"}));
 assert.throws(()=>verifyApproval(args,{...env,FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"}));
 assert.throws(()=>verifyApproval(args,{...env,FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099"}));
});
test("only creates single-use invitation; does not change original members or missions",async()=>{
 const {db,writes}=fake();
 await issueRecovery({db,token,serverTimestamp:()=>({marker:"server"})});
 assert.equal(writes.length,1);
 assert.equal(writes[0].path,"invites/"+token);
 assert.deepEqual(writes[0].value,{
  activityId:"pilot2026",groupId:"group01",studentCode:"TEST01",claimedBy:null,
  createdAt:{marker:"server"},purpose:"device-recovery"
 });
});
test("refuses invalid token, unknown or revoked member, missing group, and duplicate token",async()=>{
 await assert.rejects(issueRecovery({db:fake().db,token:"bad",serverTimestamp:()=>null}));
 for(const options of [{hasMember:false},{revoked:true},{hasGroup:false},{existingInvite:true}]){
  const {db,writes}=fake(options);
  await assert.rejects(issueRecovery({db,token,serverTimestamp:()=>null}));
  assert.equal(writes.length,0);
 }
});
