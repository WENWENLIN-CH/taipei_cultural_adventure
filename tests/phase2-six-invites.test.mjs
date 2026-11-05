// Phase2 invite enrollment: six isolated anonymous-style user IDs, three groups.
// Local Firestore emulator only; mirrors group-service.js browser transaction.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc,runTransaction,serverTimestamp,collection,getDocs,writeBatch} from "firebase/firestore";
const PROJECT="demo-taipei-phase2";
if(!process.env.FIRESTORE_EMULATOR_HOST ||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://") ||
 process.env.GCLOUD_PROJECT!==PROJECT)
 throw Error("Phase2 enrollment test requires isolated demo Firestore emulator");
const env=await initializeTestEnvironment({
 projectId:PROJECT,
 firestore:{host:"127.0.0.1",port:8080,
  rules:readFileSync("docs/firestore-group-draft.rules","utf8")}
});
const activity="phase2sandbox",groupIds=["group01","group02","group03"];
const base=g=>`activities/${activity}/groups/${g}`;
const users=groupIds.flatMap((group,i)=>[1,2].map((n)=>({
 group,uid:`phase2_${i+1}_student0${n}`,
 code:`P2G${i+1}S0${n}`,
 token:(String(i*2+n)).repeat(48)
})));
const dbFor=u=>env.authenticatedContext(u.uid).firestore();
async function join(u){
 const db=dbFor(u),inviteRef=doc(db,"invites/"+u.token);
 const invitation=await getDoc(inviteRef);
 if(!invitation.exists())throw Error("Invitation missing");
 const info=invitation.data();
 await runTransaction(db,async tx=>{
  const latest=await tx.get(inviteRef);
  if(!latest.exists()||latest.data().claimedBy!==null)throw Error("Invitation already claimed");
  const memberRef=doc(db,`activities/${info.activityId}/groups/${info.groupId}/members/${u.uid}`);
  tx.update(inviteRef,{claimedBy:u.uid,claimedAt:serverTimestamp()});
  tx.set(memberRef,{inviteId:u.token,studentCode:latest.data().studentCode,joinedAt:serverTimestamp()});
 });
 return {activityId:info.activityId,groupId:info.groupId,studentCode:info.studentCode};
}
try{
 await test("Seed exactly three empty groups and six unique single-use invitations in emulator",async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
   for(const group of groupIds)await setDoc(doc(ctx.firestore(),base(group)),{displayName:group});
   for(const u of users)await setDoc(doc(ctx.firestore(),"invites/"+u.token),{
    activityId:activity,groupId:u.group,studentCode:u.code,claimedBy:null
   });
   await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01"),{displayName:"protected pilot"});
   await setDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/missions/1"),{status:"completed",marker:"untouched"});
  });
  assert.equal(new Set(users.map(u=>u.token)).size,6);
 });
 await test("Anonymous-style users claim individual invitations transactionally and join correct group",async()=>{
  for(const u of users){
   const joined=await assertSucceeds(join(u));
   assert.deepEqual(joined,{activityId:activity,groupId:u.group,studentCode:u.code});
   const membership=await assertSucceeds(getDoc(doc(dbFor(u),base(u.group)+"/members/"+u.uid)));
   assert.equal(membership.data().studentCode,u.code);
   assert.equal(membership.data().inviteId,u.token);
   const claimed=await assertSucceeds(getDoc(doc(dbFor(u),"invites/"+u.token)));
   assert.equal(claimed.data().claimedBy,u.uid);
  }
 });
 await test("All six users can read same-group progress, not other groups",async()=>{
  for(const u of users){
   await assertSucceeds(getDoc(doc(dbFor(u),base(u.group)+"/missions/1")));
   for(const other of groupIds.filter(x=>x!==u.group)){
    await assertFails(getDoc(doc(dbFor(u),base(other)+"/missions/1")));
    await assertFails(getDoc(doc(dbFor(u),base(other)+"/members/"+users.find(v=>v.group===other).uid)));
   }
  }
 });
 await test("Claimed invitations cannot be reused by a different account",async()=>{
  const original=users[0],attacker={uid:"attacker",token:original.token};
  await assert.rejects(join(attacker));
  const batch=writeBatch(dbFor(attacker));
  batch.update(doc(dbFor(attacker),"invites/"+original.token),{claimedBy:attacker.uid,claimedAt:serverTimestamp()});
  batch.set(doc(dbFor(attacker),base(original.group)+"/members/"+attacker.uid),{
   inviteId:original.token,studentCode:original.code,joinedAt:serverTimestamp()
  });
  await assertFails(batch.commit());
  await assertFails(getDoc(doc(dbFor(attacker),base(original.group)+"/missions/1")));
 });
 await test("Unauthorized direct membership creation and invitation enumeration are rejected",async()=>{
  const outsider={uid:"uninvited"};
  await assertFails(setDoc(doc(dbFor(outsider),base("group03")+"/members/uninvited"),{
   inviteId:users[5].token,studentCode:users[5].code,joinedAt:serverTimestamp()
  }));
  await assertFails(getDocs(collection(dbFor(outsider),"invites")));
 });
 await test("Pilot2026 retains same mission document and is not enrolled by sandbox invites",async()=>{
  const u=users[0];
  await assertFails(getDoc(doc(dbFor(u),"activities/pilot2026/groups/group01/missions/1")));
  const marker=await env.withSecurityRulesDisabled(async ctx=>
   getDoc(doc(ctx.firestore(),"activities/pilot2026/groups/group01/missions/1")));
  assert.equal(marker.data().marker,"untouched");
 });
}finally{await env.cleanup();}
