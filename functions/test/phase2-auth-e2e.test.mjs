// Phase2 end-to-end authentication + Firestore enrollment rehearsal.
// Six real Auth Emulator anonymous accounts, three independent group memberships.
// The projectId MUST remain a demo- project. Never touches online Firebase.
import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp as initializeClientApp,deleteApp as deleteClientApp} from "firebase/app";
import {getAuth,connectAuthEmulator,signInAnonymously} from "firebase/auth";
import {getFirestore as clientFirestore,connectFirestoreEmulator,doc,getDoc,runTransaction,serverTimestamp,onSnapshot,writeBatch} from "firebase/firestore";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp} from "firebase-admin/app";
import {getFirestore as adminFirestore,FieldValue} from "firebase-admin/firestore";

const projectId="demo-taipei-phase2";
if(process.env.GCLOUD_PROJECT!==projectId ||
 !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
 !process.env.FIRESTORE_EMULATOR_HOST ||
 process.env.FIREBASE_AUTH_EMULATOR_HOST.includes("://") ||
 process.env.FIRESTORE_EMULATOR_HOST.includes("://"))
 throw Error("Only demo-project Auth + Firestore emulators are allowed");
const groupIds=["group01","group02","group03"],activity="phase2sandbox";
const groupBase=g=>`activities/${activity}/groups/${g}`;
const adminApp=initializeAdminApp({projectId},"phase2-auth-admin");
const db=adminFirestore(adminApp);
const students=[];
const tokens=groupIds.flatMap((group,i)=>[1,2].map((n)=>({
 group,code:`G${i+1}S${n}`,token:String(i*2+n+1).repeat(48)
})));
const makeStudent=async (group,code,token,index)=>{
 const app=initializeClientApp({apiKey:"phase2-emulator-only",projectId,appId:"phase2-rehearsal",authDomain:"localhost"},`phase2-student-${index}`);
 const auth=getAuth(app);
 connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
 const user=(await signInAnonymously(auth)).user;
 const firestore=clientFirestore(app);
 connectFirestoreEmulator(firestore,"127.0.0.1",8080);
 return {app,auth,user,firestore,group,code,token};
};
async function join(student){
 const {firestore,token,user}=student;
 const inviteRef=doc(firestore,"invites/"+token);
 const invite=await getDoc(inviteRef);
 if(!invite.exists())throw Error("Invitation not found");
 const info=invite.data();
 await runTransaction(firestore,async tx=>{
  const current=await tx.get(inviteRef);
  if(!current.exists()||current.data().claimedBy!==null)throw Error("Invitation already claimed");
  tx.update(inviteRef,{claimedBy:user.uid,claimedAt:serverTimestamp()});
  tx.set(doc(firestore,`activities/${info.activityId}/groups/${info.groupId}/members/${user.uid}`),{
   inviteId:token,studentCode:current.data().studentCode,joinedAt:serverTimestamp()
  });
 });
 return {activityId:info.activityId,groupId:info.groupId,studentCode:info.studentCode};
}
const permissionDenied=async promise=>{
 await assert.rejects(promise,e=>e?.code==="permission-denied", "Expected Firestore PERMISSION_DENIED");
};
async function observeCompletion(student,path,write){
 const ref=doc(student.firestore,path);
 let unsub=()=>{};
 let timeout;
 try{
  const watched=new Promise((resolve,reject)=>{
   timeout=setTimeout(()=>reject(Error("Firestore snapshot listener timed out")),8000);
   unsub=onSnapshot(ref,snap=>{
    if(snap.data()?.status==="completed")resolve(snap.data());
   },reject);
  });
  await write();
  return await watched;
 }finally{clearTimeout(timeout);unsub();}
}
try{
 await test("Create three rehearsal groups and six one-time invites only in demo emulator",async()=>{
  for(const group of groupIds)await db.doc(groupBase(group)).create({displayName:group});
  for(const t of tokens)await db.doc("invites/"+t.token).create({
   activityId:activity,groupId:t.group,studentCode:t.code,claimedBy:null
  });
  await db.doc("activities/pilot2026/groups/group01/missions/1").create({
   status:"completed",marker:"pilot-unchanged"
  });
 });
 await test("Auth Emulator really creates six distinct anonymous Firebase identities",async()=>{
  for(const [i,t] of tokens.entries()){
   const student=await makeStudent(t.group,t.code,t.token,i);
   assert.equal(student.user.isAnonymous,true);
   assert.equal(student.auth.currentUser.uid,student.user.uid);
   students.push(student);
  }
  assert.equal(new Set(students.map(s=>s.user.uid)).size,6);
 });
 await test("All six Auth UIDs join correct group with one-use Firestore transactions",async()=>{
  for(const s of students){
   const joined=await join(s);
   assert.deepEqual(joined,{activityId:activity,groupId:s.group,studentCode:s.code});
   const member=(await getDoc(doc(s.firestore,groupBase(s.group)+"/members/"+s.user.uid))).data();
   assert.equal(member.studentCode,s.code);
   const token=(await db.doc("invites/"+s.token).get()).data();
   assert.equal(token.claimedBy,s.user.uid);
  }
 });
 await test("Another student in same group receives Firestore shared-completion snapshot",async()=>{
  const sender=students[0],receiver=students[1];
  assert.equal(sender.group,receiver.group);
  const path=groupBase(sender.group)+"/missions/1";
  const got=await observeCompletion(receiver,path,async()=>{
   await db.doc(path).create({status:"completed",submittedByUid:sender.user.uid,submittedAt:FieldValue.serverTimestamp()});
  });
  assert.equal(got.submittedByUid,sender.user.uid);
  // Other groups remain at 0/5 when group01 completes one mission.
  for(const group of groupIds.slice(1)){
   const snap=await db.doc(groupBase(group)+"/missions/1").get();
   assert.equal(snap.exists,false);
  }
 });
 await test("Authenticated students cannot read other groups or protected pilot2026",async()=>{
  for(const s of students){
   for(const group of groupIds.filter(g=>g!==s.group)){
    await permissionDenied(getDoc(doc(s.firestore,groupBase(group)+"/missions/1")));
   }
   await permissionDenied(getDoc(doc(s.firestore,"activities/pilot2026/groups/group01/missions/1")));
  }
  const original=await db.doc("activities/pilot2026/groups/group01/missions/1").get();
  assert.equal(original.data().marker,"pilot-unchanged");
 });
 await test("Another real anonymous account cannot reuse claimed invitation",async()=>{
  const outsider=await makeStudent("group01","ATTACK",students[0].token,6);
  students.push(outsider);
  await assert.rejects(join(outsider),/already claimed/);
  const batch=writeBatch(outsider.firestore);
  batch.update(doc(outsider.firestore,"invites/"+outsider.token),{
   claimedBy:outsider.user.uid,claimedAt:serverTimestamp()
  });
  batch.set(doc(outsider.firestore,groupBase("group01")+"/members/"+outsider.user.uid),{
   inviteId:outsider.token,studentCode:students[0].code,joinedAt:serverTimestamp()
  });
  await permissionDenied(batch.commit());
  await permissionDenied(getDoc(doc(outsider.firestore,groupBase("group01")+"/missions/1")));
 });
 await test("Existing member can resume using same anonymous Auth identity",async()=>{
  const s=students[0];
  assert.equal(s.auth.currentUser.uid,s.user.uid);
  const member=await getDoc(doc(s.firestore,groupBase(s.group)+"/members/"+s.auth.currentUser.uid));
  assert.equal(member.exists(),true);
  assert.equal(member.data().studentCode,s.code);
 });
}finally{
 await Promise.allSettled(students.map(s=>deleteClientApp(s.app)));
 await deleteAdminApp(adminApp);
}
