import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getMetadata, deleteObject, listAll } from "firebase/storage";

const projectId="demo-taipei-storage";
const env=await initializeTestEnvironment({
  projectId,
  firestore:{host:"127.0.0.1",port:8080,rules:readFileSync("docs/firestore-group-draft.rules","utf8")},
  storage:{host:"127.0.0.1",port:9199,rules:readFileSync("storage.rules","utf8")}
});
const bucket=`gs://${projectId}.firebasestorage.app`;
const path=(group,uid,name="photo1.jpg")=>
  `activities/demo2026/groups/${group}/missions/1/${uid}/${name}`;
const alice=env.authenticatedContext("alice");
const bob=env.authenticatedContext("bob");
const outsider=env.authenticatedContext("outsider");
const teacher=env.authenticatedContext("teacher1");
const anonymous=env.unauthenticatedContext();
const image=new Uint8Array([255,216,255,217]); // Test bytes only; the Storage rules validate declared MIME, not actual JPEG encoding.
const metadata={contentType:"image/jpeg"};
let count=0;
async function check(title,fn) {
  try { await fn(); console.log("PASS",title); count++; }
  catch(e) { console.error("FAIL",title,e.message); throw e; }
}
try {
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(doc(db,"activities/demo2026/groups/group01/members/alice"),{studentCode:"S01"});
    await setDoc(doc(db,"activities/demo2026/groups/group02/members/bob"),{studentCode:"S02"});
    await setDoc(doc(db,"teacherAccess/teacher1"),{authorized:true});
  });
  const aliceRef=ref(alice.storage(bucket),path("group01","alice"));
  await check("同組本人可上傳 JPEG",()=>assertSucceeds(uploadBytes(aliceRef,image,metadata)));
  await check("同組成員可查看照片",()=>assertSucceeds(getMetadata(aliceRef)));
  await check("不同組成員不可查看照片",()=>assertFails(getMetadata(ref(bob.storage(bucket),path("group01","alice")))));
  await check("未加入的人不可查看照片",()=>assertFails(getMetadata(ref(outsider.storage(bucket),path("group01","alice")))));
  await check("未登入者不可查看照片",()=>assertFails(getMetadata(ref(anonymous.storage(bucket),path("group01","alice")))));
  await check("教師可查看照片",()=>assertSucceeds(getMetadata(ref(teacher.storage(bucket),path("group01","alice")))));
  await check("不可覆蓋已上傳照片",()=>assertFails(uploadBytes(aliceRef,image,metadata)));
  await check("不可刪除照片",()=>assertFails(deleteObject(aliceRef)));
  await check("不可列出整個資料夾",()=>assertFails(listAll(ref(alice.storage(bucket),"activities/demo2026/groups/group01/missions/1/alice"))));
  await check("不可冒充別人 UID 上傳",()=>assertFails(uploadBytes(ref(alice.storage(bucket),path("group01","bob","photo1.jpg")),image,metadata)));
  await check("不屬於該組者不能上傳",()=>assertFails(uploadBytes(ref(bob.storage(bucket),path("group01","bob","photo1.jpg")),image,metadata)));
  await check("不接受非 JPEG MIME",()=>assertFails(uploadBytes(ref(alice.storage(bucket),path("group01","alice","photo2.jpg")),image,{contentType:"image/png"})));
  await check("不接受錯誤照片欄位名稱",()=>assertFails(uploadBytes(ref(alice.storage(bucket),path("group01","alice","wrong.jpg")),image,metadata)));
  await check("不接受超過 1MB 的檔案",()=>assertFails(uploadBytes(ref(alice.storage(bucket),path("group01","alice","photo2.jpg")),new Uint8Array(1024*1024+1),metadata)));
  await check("未登入者不可上傳",()=>assertFails(uploadBytes(ref(anonymous.storage(bucket),path("group01","anon","photo1.jpg")),image,metadata)));
  console.log(`All ${count} Storage rules checks passed (emulators only).`);
} finally {
  await env.cleanup();
}
