import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-taipei-quest",
  firestore: {
    rules: readFileSync("docs/firestore-group-draft.rules", "utf8"),
    host: "127.0.0.1",
    port: 8080
  }
});
const groupA = "activities/demo2026/groups/group01";
const groupB = "activities/demo2026/groups/group02";
const invite = "a".repeat(48);
let passed=0;
async function check(label,fn) {
  try { await fn(); console.log("PASS", label); passed++; }
  catch (e) { console.error("FAIL",label,e?.message??e); throw e; }
}
try {
  await env.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore();
    await setDoc(doc(db, groupA), { displayName:"第一組" });
    await setDoc(doc(db, groupB), { displayName:"第二組" });
    await setDoc(doc(db, groupA+"/members/alice"), {studentCode:"S01", inviteId:"seed", joinedAt:new Date()});
    await setDoc(doc(db, groupB+"/members/bob"), {studentCode:"S02", inviteId:"seed", joinedAt:new Date()});
    await setDoc(doc(db, groupA+"/missions/1"), {status:"completed",submittedByUid:"alice"});
    await setDoc(doc(db,"teacherAccess/teacher1"), {authorized:true});
    await setDoc(doc(db,"invites/"+invite),{
      activityId:"demo2026",groupId:"group01",studentCode:"S03",claimedBy:null
    });
  });

  const alice=env.authenticatedContext("alice").firestore();
  const bob=env.authenticatedContext("bob").firestore();
  const charlie=env.authenticatedContext("charlie").firestore();
  const teacher=env.authenticatedContext("teacher1").firestore();
  const anon=env.unauthenticatedContext().firestore();

  await check("未登入不可查看組別",()=>assertFails(getDoc(doc(anon,groupA))));
  await check("成員可查看自己組別",()=>assertSucceeds(getDoc(doc(alice,groupA))));
  await check("成員不可查看別組",()=>assertFails(getDoc(doc(alice,groupB))));
  await check("成員可查看自己的關卡",()=>assertSucceeds(getDoc(doc(alice,groupA+"/missions/1"))));
  await check("成員不可查看別組關卡",()=>assertFails(getDoc(doc(bob,groupA+"/missions/1"))));
  await check("教師可查看兩組關卡",async()=>{
    await assertSucceeds(getDoc(doc(teacher,groupA+"/missions/1")));
    await assertSucceeds(getDoc(doc(teacher,groupB+"/missions/1")));
  });
  await check("學生不可自行建立教師權限",()=>assertFails(setDoc(doc(alice,"teacherAccess/alice"),{authorized:true})));
  await check("學生不能偽造完成關卡",()=>assertFails(setDoc(doc(alice,groupA+"/missions/2"),{status:"completed"})));
  await check("學生不可偷取他人的成員文件",()=>assertFails(getDoc(doc(alice,groupB+"/members/bob"))));
  await check("未登入不可讀取邀請碼",()=>assertFails(getDoc(doc(anon,"invites/"+invite))));
  await check("匿名持有正確邀請碼可讀取該邀請",()=>assertSucceeds(getDoc(doc(charlie,"invites/"+invite))));
  await check("不能只靠新增 member 文件偷加入",()=>assertFails(setDoc(doc(charlie,groupA+"/members/charlie"),{inviteId:invite,studentCode:"S03",joinedAt:serverTimestamp()})));
  await check("直接領取邀請碼、未建立成員時必須拒絕",()=>assertFails(
    setDoc(doc(charlie,"invites/"+invite),{claimedBy:"charlie",claimedAt:serverTimestamp()},{merge:true})
  ));
  await check("錯誤組別或學生代碼不能領取邀請碼",async()=>{
    const batch=writeBatch(charlie);
    batch.update(doc(charlie,"invites/"+invite), {claimedBy:"charlie",claimedAt:serverTimestamp()});
    batch.set(doc(charlie,groupB+"/members/charlie"), {inviteId:invite,studentCode:"S03",joinedAt:serverTimestamp()});
    await assertFails(batch.commit());
  });
  await check("未加入的使用者無法查看小組資料",()=>assertFails(getDoc(doc(charlie,groupA))));
  await check("未加入的使用者無法查看第一組關卡",()=>assertFails(getDoc(doc(charlie,groupA+"/missions/1"))));
  await check("一次性邀請碼與成員建立必須原子提交",async()=>{
    const batch=writeBatch(charlie);
    batch.update(doc(charlie,"invites/"+invite), {claimedBy:"charlie",claimedAt:serverTimestamp()});
    batch.set(doc(charlie,groupA+"/members/charlie"), {inviteId:invite,studentCode:"S03",joinedAt:serverTimestamp()});
    await assertSucceeds(batch.commit());
    const result=await assertSucceeds(getDoc(doc(charlie,groupA)));
    assert.equal(result.data().displayName,"第一組");
  });
  await check("同一邀請碼不可被別人再次領取",async()=>{
    const batch=writeBatch(bob);
    batch.update(doc(bob,"invites/"+invite),{claimedBy:"bob",claimedAt:serverTimestamp()});
    batch.set(doc(bob,groupA+"/members/bob"),{inviteId:invite,studentCode:"S03",joinedAt:serverTimestamp()});
    await assertFails(batch.commit());
  });
  console.log(`All ${passed} Firestore rules checks passed (emulator only).`);
} finally {
  await env.cleanup();
}
