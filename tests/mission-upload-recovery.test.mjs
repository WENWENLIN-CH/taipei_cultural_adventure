import assert from "node:assert/strict";
import test from "node:test";
import {uploadMissionWithRecovery} from "../mission-upload-recovery.js";
import {FORM_SPEC} from "../mission-form-adapter.js";

const jpeg="data:image/jpeg;base64,/9j/";
const values={
 1:{location:"台北"},
 2:{lang1_lang:"韓文",lang2_lang:"泰文",lang3_lang:"越南文",lang4_lang:"英文"},
 4:{c1_continent:"亞洲",c1_country:"臺灣",c1_restaurant:"A",c2_continent:"歐洲",c2_country:"義大利",c2_restaurant:"B",c3_continent:"非洲",c3_country:"摩洛哥",c3_restaurant:"C"},
 5:{p1_country:"泰國",p1_name:"A",p2_country:"越南",p2_name:"B",p3_country:"菲律賓",p3_name:"C"}
};
const form=n=>({...values[n],...Object.fromEntries(FORM_SPEC[n].photoKeys.map(k=>[k,jpeg])),safetyCheck:true});
const blob=new Blob([new Uint8Array([255,216,255,217])],{type:"image/jpeg"});
const path=(n,k)=>`activities/demo2026/groups/group01/missions/${n}/mockUid/${k}.jpg`;
const base=(n,extra={})=>({missionId:n,formData:form(n),loadPhoto:async()=>blob,...extra});

for(const n of [1,2,4,5]){
 await test(`第 ${n} 關：所有照片確認後才提交且路徑完整`,async()=>{
   let submitted=0;const progress=[];
   const result=await uploadMissionWithRecovery(base(n,{
     onProgress:s=>progress.push(s),
     uploadPhoto:async({photoKey})=>({path:path(n,photoKey),reused:false}),
     submitMission:async payload=>{submitted++;assert.deepEqual(Object.keys(payload.photoPaths),FORM_SPEC[n].photoKeys);assert.equal(Object.keys(payload.answers).length,FORM_SPEC[n].answerKeys.length);return {status:"completed"};}
   }));
   assert.equal(submitted,1);assert.equal(result.status,"completed");
   assert.ok(progress.some(s=>s.includes("等待 Firestore")));
 });
 await test(`第 ${n} 關：未完成的原始表單必須在上傳前被拒絕`,async()=>{
   let uploads=0;const broken=form(n);broken[FORM_SPEC[n].photoKeys[0]]="";
   await assert.rejects(uploadMissionWithRecovery(base(n,{formData:broken,uploadPhoto:async()=>{uploads++;},submitMission:async()=>{throw Error("should never submit");}})),/照片/);
   assert.equal(uploads,0);
 });
 await test(`第 ${n} 關：首次上傳中斷，原照片重試重用而不覆寫`,async()=>{
   const stored=new Map();const keys=FORM_SPEC[n].photoKeys;let failOnce=true,submits=0,creates=0,reuses=0;
   // Simulates an immutable Storage object that was committed just before
   // the network failure, with subsequent exact-byte digest verification.
   const uploadPhoto=async({photoKey,blob:b})=>{
     const key=path(n,photoKey);
     const bytes=new Uint8Array(await b.arrayBuffer());
     const old=stored.get(key);
     if(old){
       assert.deepEqual(bytes,old,"retry must supply identical bytes");
       reuses++;return {path:key,reused:true};
     }
     stored.set(key,bytes);creates++;
     if(failOnce && photoKey===keys[Math.min(1,keys.length-1)]){
       failOnce=false;throw Error("network broke after Storage commit");
     }
     return {path:key,reused:false};
   };
   const args=base(n,{uploadPhoto,submitMission:async()=>{submits++;return {status:"completed"};}});
   await assert.rejects(uploadMissionWithRecovery(args),/保留原始照片/);
   assert.equal(submits,0,"never submit an incomplete photo set");
   assert.equal(stored.size,Math.min(2,keys.length));
   const result=await uploadMissionWithRecovery(args);
   assert.equal(result.status,"completed");assert.equal(submits,1);
   assert.equal(creates,keys.length,"no immutable photo slot overwritten");
   assert.ok(reuses>=1,"already stored images must be reused");
 });
 await test(`第 ${n} 關：不同照片不得覆寫既有欄位`,async()=>{
   let calls=0;
   await assert.rejects(uploadMissionWithRecovery(base(n,{
     uploadPhoto:async()=>{calls++;throw Error("此欄位已有不同照片，不能覆蓋");},
     submitMission:async()=>{throw Error("should never submit");}
   })),/不同照片/);
   assert.equal(calls,1);
 });
}
await test("第二關：第三張失敗時不會跳到第四張或寫入完成紀錄",async()=>{
 const tried=[];let submitted=false;
 await assert.rejects(uploadMissionWithRecovery(base(2,{
   uploadPhoto:async({photoKey})=>{tried.push(photoKey);if(photoKey==="lang3_photo")throw Error("offline");return {path:path(2,photoKey)};},
   submitMission:async()=>{submitted=true;}
 })),/lang3_photo/);
 assert.deepEqual(tried,["lang1_photo","lang2_photo","lang3_photo"]);assert.equal(submitted,false);
});
await test("照片是錯誤 MIME / 空檔案 / 超過上限時不呼叫上傳",async()=>{
 for(const photo of [new Blob(["x"],{type:"image/png"}),new Blob([],{type:"image/jpeg"}),new Blob([new Uint8Array(1024*1024+1)],{type:"image/jpeg"})]){
   let uploads=0;
   await assert.rejects(uploadMissionWithRecovery(base(1,{
     loadPhoto:async()=>photo,
     uploadPhoto:async()=>{uploads++;},
     submitMission:async()=>{throw Error("unexpected submit");}
   })),/照片必須/);
   assert.equal(uploads,0);
 }
});
