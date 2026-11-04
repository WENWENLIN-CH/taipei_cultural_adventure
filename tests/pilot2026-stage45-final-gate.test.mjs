// Checks the actual generated cloud puzzle gate without any Firebase writes.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {runInNewContext} from "node:vm";
const read=p=>readFileSync(p,"utf8");
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
const dir=".firebase-preview/";
const js=read(dir+"pilot2026-stage5-review-quest.js");
const boot=read(dir+"pilot2026-stage5-review-bootstrap.js");
function extract(name){
 const m=js.match(new RegExp("function "+name+"\\(\\)\\s*\\{[^}]*\\}"));
 assert.ok(m,"Missing actual generated "+name+" function");
 return m[0];
}
test("Cloud mission completion and final gate use Firestore-backed callbacks, not cached local state",()=>{
 const counter=extract("doneCount");
 const gate=extract("finalUnlocked");
 assert.ok(counter.includes("window.cloudQuestCompleted?.(m.id)"));
 assert.ok(gate.includes("return doneCount()===5;"));
 assert.ok(!gate.includes("teacherUnlocked"));
 assert.ok(!counter.includes("state.missions"));
 assert.ok(boot.includes("watchGroupMissions(g,"));
 assert.ok(boot.includes("const SUBMISSIONS_ENABLED=false;"));
});
test("Actual generated final gate stays locked at 3/5 and 4/5, unlocks at exactly 5/5",()=>{
 const source=extract("doneCount")+"\n"+extract("finalUnlocked")+"\nfinalUnlocked()";
 for(const n of [0,3,4,5]){
  const completed=new Set(Array.from({length:n},(_,i)=>i+1));
  const result=runInNewContext(source,{
   missions:[1,2,3,4,5].map(id=>({id})),
   window:{cloudQuestCompleted:id=>completed.has(id)},
   state:{teacherUnlocked:true}
  });
  assert.equal(result,n===5,"Firestore "+n+"/5 cannot be bypassed by local teacher unlock");
 }
});
test("Stage4 and Stage5 review pages do not allow cloud submission and retain separate drafts",()=>{
 for(const n of [4,5]){
  const page=read(dir+"pilot2026-stage"+n+"-review-quest.js");
  const bootstrap=read(dir+"pilot2026-stage"+n+"-review-bootstrap.js");
  assert.ok(page.includes("taipeiCulturalQuestPilot2026Stage"+n+"ReviewV1"));
  assert.ok(bootstrap.includes("const SUBMISSIONS_ENABLED=false;"));
  assert.ok(!bootstrap.includes("submitPilot2026Stage"+n));
 }
});
test("Existing QR, Stage1-3 and teacher backend persist in the combined package",()=>{
 for(const n of [1,2,3]){
  assert.ok(read(dir+"pilot2026-stage"+n+"-live-bootstrap.js").includes("const STAGE1_MISSION="+n+";"));
 }
 assert.ok(read(dir+"pilot2026-qr-join-bootstrap.js").includes("readAndClearQrInvite("));
 assert.ok(read(dir+"teacher-dashboard.js").includes("揭秘南洋商店"));
});
