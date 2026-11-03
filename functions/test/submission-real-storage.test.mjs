// Real Firestore + REAL Storage emulator objects, with the production submission handler.
// This does not test callable HTTP protocol / Firebase Auth emulator tokens.
import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createSubmissionHandler } from "../submission-handler.js";

const projectId="demo-taipei-storage-submit";
const bucketName=projectId+".firebasestorage.app";
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST.includes("http") ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST.includes("http") ||
    process.env.GCLOUD_PROJECT?.startsWith("taipei-cultural-adventure")) {
  throw Error("Both FIRESTORE_EMULATOR_HOST and FIREBASE_STORAGE_EMULATOR_HOST must be set without protocol; never run against production.");
}
const app=initializeApp({projectId,storageBucket:bucketName},"real-storage-e2e");
const db=getFirestore(app);
const bucket=getStorage(app).bucket(bucketName);
const makeError=(code,message)=>Object.assign(new Error(message),{code});
const handle=createSubmissionHandler({db,bucket,serverTimestamp:()=>FieldValue.serverTimestamp(),makeError});
const base="activities/demo2026/groups/group01";
const prefix=base+"/missions/1";
const path=prefix+"/alice/photo1.jpg";
const validJpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x00,0x00,0x00,0x00,0xff,0xd9]);
const payload=(photoPath=path)=>({activityId:"demo2026",groupId:"group01",missionId:1,answers:{location:"台北"},photoPaths:{photo1:photoPath}});
const mission=db.doc(prefix);
async function clearMission(){await mission.delete();}
async function removeImage(){const file=bucket.file(path);const [exists]=await file.exists();if(exists)await file.delete();}
async function uploadImage(bytes=validJpeg,mime="image/jpeg"){
  await bucket.file(path).save(bytes,{resumable:false,contentType:mime});
}
try {
  await db.doc(base).set({displayName:"第一組"});
  await db.doc(base+"/members/alice").set({studentCode:"S01"});
  await db.doc(base+"/members/bob").set({studentCode:"S02"});
  await db.doc("activities/demo2026/groups/group02/members/outsider").set({studentCode:"X01"});
  await removeImage();
  await clearMission();

  await test("照片確實不存在時不得過關",async()=>{
    await assert.rejects(handle({uid:"alice",anonymous:true,data:payload()}),{code:"failed-precondition"});
    assert.equal((await mission.get()).exists,false);
  });
  await test("上傳真實 Storage Emulator 物件後可以提交",async()=>{
    await uploadImage();
    const result=await handle({uid:"alice",anonymous:true,data:payload()});
    assert.equal(result.status,"completed");
    const record=(await mission.get()).data();
    assert.equal(record.submittedByUid,"alice");
    assert.equal(record.submittedByCode,"S01");
    assert.deepEqual(record.photoPaths,{photo1:path});
    assert.ok(record.submittedAt.toDate() instanceof Date);
  });
  await test("重複提交禁止覆蓋第一份成果",async()=>{
    await assert.rejects(handle({uid:"bob",anonymous:true,data:payload()}),{code:"already-exists"});
    assert.equal((await mission.get()).data().submittedByUid,"alice");
  });
  await test("跨組冒用照片路徑被拒絕",async()=>{
    await clearMission();
    await assert.rejects(handle({uid:"bob",anonymous:true,data:payload(path.replace("group01","group02"))}),{code:"invalid-argument"});
    assert.equal((await mission.get()).exists,false);
  });
  await test("其他組學生不可提交本組成果",async()=>{
    await assert.rejects(handle({uid:"outsider",anonymous:true,data:payload()}),{code:"permission-denied"});
  });
  await test("偽造照片中繼資料中的 MIME 不可過關",async()=>{
    await removeImage();
    await uploadImage(validJpeg,"image/png");
    await assert.rejects(handle({uid:"alice",anonymous:true,data:payload()}),{code:"failed-precondition"});
    assert.equal((await mission.get()).exists,false);
  });
  await test("檔案宣稱 JPEG 但內容不是 JPEG 不可過關",async()=>{
    await removeImage();
    await uploadImage(Buffer.from([0x00,0x01,0x02,0x03]),"image/jpeg");
    await assert.rejects(handle({uid:"alice",anonymous:true,data:payload()}),{code:"failed-precondition"});
  });
  await test("兩位組員同時提交，只能有一筆成功",async()=>{
    await removeImage();
    await uploadImage();
    await clearMission();
    const results=await Promise.allSettled(["alice","bob"].map(uid=>handle({uid,anonymous:true,data:payload()})));
    assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(results.filter(r=>r.status==="rejected"&&r.reason?.code==="already-exists").length,1);
    const record=(await mission.get()).data();
    assert.ok(["alice","bob"].includes(record.submittedByUid));
  });
} finally {
  await deleteApp(app);
}
