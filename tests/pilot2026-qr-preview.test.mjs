import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {readAndClearQrInvite,makeQrJoinUrl} from "../qr-invite-link.js";

const token="a".repeat(48);
const origin="https://taipei-cultural-adventure--auth-test-h1vdhpta.web.app";
test("valid QR token is extracted then removed before network work",()=>{
 const calls=[];
 const loc={pathname:"/pilot2026-qr-join.html",search:"",hash:"#join="+token};
 const history={replaceState:(...args)=>calls.push(args)};
 assert.deepEqual(readAndClearQrInvite(loc,history),{kind:"valid",token});
 assert.deepEqual(calls,[[null,"","/pilot2026-qr-join.html"]]);
});
test("invalid or tampered fragments never enroll and are cleared",()=>{
 for(const hash of ["#join="+token+"&other=1","#join=short","#other="+token,"#join="+token+"#extra"]){
  const calls=[];
  assert.deepEqual(readAndClearQrInvite({hash,pathname:"/pilot2026-qr-join.html",search:""},{
   replaceState:(...args)=>calls.push(args)
  }),{kind:"invalid",token:null});
  assert.equal(calls.length,1);
 }
});
test("generated QR URL contains valid private fragment on approved Hosting origin only",()=>{
 assert.equal(makeQrJoinUrl(origin,token),origin+"/pilot2026-qr-join.html#join="+token);
 for(const bad of ["https://example.com","http://taipei-cultural-adventure.web.app","https://other.web.app"]){
  assert.throws(()=>makeQrJoinUrl(bad,token));
 }
 assert.throws(()=>makeQrJoinUrl(origin,"bad"));
});
const sha=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
const protectedFiles=["index.html","script.js","pilot2026-cloud-bootstrap.js","functions/index.js","storage.rules","firebase.json"];
const before=protectedFiles.map(sha);
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
const read=p=>readFileSync(p,"utf8");
test("QR preview keeps all existing and production sources untouched",()=>{
 assert.deepEqual(protectedFiles.map(sha),before);
 assert.ok(read(".firebase-preview/pilot2026-cloud-bootstrap.js").includes("const SUBMISSIONS_ENABLED=false;"));
});
test("QR page only autojoins through existing one-time invitation process",()=>{
 const html=read(".firebase-preview/pilot2026-qr-join.html");
 const boot=read(".firebase-preview/pilot2026-qr-join-bootstrap.js");
 assert.ok(html.includes('src="pilot2026-qr-join-bootstrap.js"'));
 assert.ok(boot.includes('readAndClearQrInvite(window.location,window.history)'));
 assert.ok(boot.includes('joinButton.click()'));
 assert.ok(boot.includes('const ACTIVITY_ID="pilot2026";'));
 assert.ok(boot.includes('const STAGE1_GROUP="group01";'));
 assert.ok(boot.includes('const STAGE1_MISSION=1;'));
 assert.ok(boot.includes('const SUBMISSIONS_ENABLED=true;'));
 assert.ok(boot.includes("await joinByInvitation(token)"));
 assert.ok(boot.includes("if(group){"));
 assert.ok(!boot.includes(token));
});
test("private generated QR images are excluded from Git and no token is committed",()=>{
 assert.ok(read(".gitignore").includes(".private-qrcodes/"));
 const generator=read("scripts/create-pilot2026-qr.mjs");
 assert.ok(generator.includes('await import("qrcode")'));
 assert.ok(generator.includes("rl.question("));
 assert.ok(!generator.includes(token));
});
