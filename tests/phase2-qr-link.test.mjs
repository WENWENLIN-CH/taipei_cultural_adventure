import test from "node:test";
import assert from "node:assert/strict";
import {readAndClearPhase2Qr,makePhase2QrUrl} from "../phase2-qr-link.js";
test("Three QR links accept reusable group token and scrub URL",()=>{
 const key="a".repeat(48);
 for(const groupId of ["group01","group02","group03"]){
  const url=makePhase2QrUrl("https://taipei-cultural-adventure.web.app",groupId,key);
  const parsed=new URL(url);
  let cleaned="";
  const result=readAndClearPhase2Qr(parsed,{replaceState:(_,__,path)=>{cleaned=path;}});
  assert.equal(result.groupId,groupId);
  assert.equal(result.code,key);
  assert.equal(cleaned,"/phase2-student-quest.html");
 }
});
test("QR helpers reject wrong group, malformed credential, invalid fragment",()=>{
 assert.throws(()=>makePhase2QrUrl("https://evil.example","group01","a".repeat(48)));
 assert.throws(()=>makePhase2QrUrl("https://taipei-cultural-adventure.web.app","group04","a".repeat(48)));
 let cleared=false;
 assert.equal(readAndClearPhase2Qr({hash:"#group=group01&code=no",pathname:"/x",search:""},
 {replaceState:()=>cleared=true}).kind,"invalid");
 assert.ok(cleared);
});
