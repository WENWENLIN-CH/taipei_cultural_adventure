// Integration test: REAL Firestore emulator + FAKE Storage backend.
// Does NOT prove production Storage SDK access or Functions callable networking.
import test from "node:test";
import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {createSubmissionHandler} from "../submission-handler.js";

if(!process.env.FIRESTORE_EMULATOR_HOST)
  throw Error("Start using npm run test:submission-emulator from repository root; refusing to touch live Firestore.");
const app=initializeApp({projectId:"demo-taipei-submission"},"submission-integration");
const db=getFirestore(app);
const validPath="activities/demo2026/groups/group01/missions/1/alice/photo1.jpg";
const base="activities/demo2026/groups/group01";
const mission=db.doc(base+"/missions/1");
const payload=(path=validPath)=>({
  activityId:"demo2026",groupId:"group01",missionId:1,
  answers:{location:"台北車站"},photoPaths:{photo1:path}
});
const validJPEG=Buffer.from([255,216,255,0,1,2,255,217]);
let state={exists:true,contentType:"image/jpeg",size:validJPEG.length,bytes:validJPEG};
const bucket={file(path){return {
  exists:async()=>[path===validPath&&state.exists],
  getMetadata:async()=>[{size:state.size,contentType:state.contentType}],
  createReadStream:()=>Readable.from([state.bytes])
};}};
const makeError=(code,message)=>Object.assign(new Error(message),{code});
const handler=createSubmissionHandler({
  db,bucket,makeError,serverTimestamp:()=>FieldValue.serverTimestamp()
});
try{
 await db.doc(base).set({displayName:"第一組"});
 await db.doc(base+"/members/alice").set({studentCode:"S01"});
 await db.doc(base+"/members/bob").set({studentCode:"S02"});
 await db.doc("activities/demo2026/groups/group02/members/other").set({studentCode:"X01"});
 const reset=async()=>{await mission.delete();state={exists:true,contentType:"image/jpeg",size:validJPEG.length,bytes:validJPEG};};
 await test("未登入不能提交",async()=>{await reset();await assert.rejects(handler({uid:null,anonymous:false,data:payload()}),{code:"unauthenticated"});});
 await test("非匿名教師不能以學生流程提交",async()=>{await reset();await assert.rejects(handler({uid:"alice",anonymous:false,data:payload()}),{code:"unauthenticated"});});
 await test("不是第一組組員不能提交",async()=>{await reset();await assert.rejects(handler({uid:"other",anonymous:true,data:payload()}),{code:"permission-denied"});});
 await test("不存在的照片不能過關",async()=>{await reset();state.exists=false;await assert.rejects(handler({uid:"alice",anonymous:true,data:payload()}),{code:"failed-precondition"});assert.equal((await mission.get()).exists,false);});
 await test("照片路徑跨組、跨關都會被拒絕",async()=>{await reset();for(const path of [validPath.replace("group01","group02"),validPath.replace("missions/1","missions/2")])await assert.rejects(handler({uid:"alice",anonymous:true,data:payload(path)}),{code:"invalid-argument"});});
 await test("上傳者不屬同組不能冒用照片",async()=>{await reset();await assert.rejects(handler({uid:"alice",anonymous:true,data:payload(validPath.replace("/alice/","/outsider/"))}),{code:"failed-precondition"});});
 await test("偽造 JPEG MIME 不得完成",async()=>{await reset();state.bytes=Buffer.from([0,1,2,3]);await assert.rejects(handler({uid:"alice",anonymous:true,data:payload()}),{code:"failed-precondition"});});
 await test("合法提交建立一筆共同成果、保留提交者與伺服器時間",async()=>{await reset();const result=await handler({uid:"alice",anonymous:true,data:payload()});assert.equal(result.status,"completed");const snap=await mission.get();assert.equal(snap.data().submittedByUid,"alice");assert.equal(snap.data().submittedByCode,"S01");assert.equal(snap.data().status,"completed");assert.ok(snap.data().submittedAt.toDate() instanceof Date);});
 await test("同一關不可重複提交",async()=>{await assert.rejects(handler({uid:"bob",anonymous:true,data:payload()}),{code:"already-exists"});});
 await test("兩位組員同時提交，只有一筆成功",async()=>{await reset();const results=await Promise.allSettled(["alice","bob"].map(uid=>handler({uid,anonymous:true,data:payload()})));assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(results.filter(x=>x.status==="rejected").length,1);assert.equal((await mission.get()).exists,true);});
 await test("被教師撤銷的舊匿名身分不得再提交，即使照片還在",async()=>{
   await reset();
   await db.doc(base+"/members/alice").update({revoked:true});
   await assert.rejects(handler({uid:"alice",anonymous:true,data:payload()}),{code:"permission-denied"});
   assert.equal((await mission.get()).exists,false);
 });
 await test("已撤銷組員不能提交，但同組未撤銷成員仍可提交",async()=>{
   await reset();
   const result=await handler({uid:"bob",anonymous:true,data:payload()});
   assert.equal(result.status,"completed");
   assert.equal((await mission.get()).data().submittedByUid,"bob");
 });
}finally{await deleteApp(app);}
