import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
test("Phone preview includes read-only teacher dashboard and rehearsal selector",()=>{
 execFileSync(process.execPath,["scripts/build-phase2-rehearsal-hosting.mjs"],{stdio:"pipe"});
 const root=".firebase-phase2-rehearsal-hosting/";
 const html=readFileSync(root+"teacher-dashboard.html","utf8");
 const js=readFileSync(root+"teacher-dashboard.js","utf8");
 const cfg=readFileSync(root+"phase2-event-config.js","utf8");
 assert.match(html,/value="taipei2026rehearsal"/);
 assert.match(js,/"taipei2026rehearsal"/);
 assert.match(js,/"teacherAccess",user[.]uid/);
 assert.match(js,/snap[.]data\(\)[.]authorized!==true/);
 assert.match(js,/submittedByCode/);
 assert.match(js,/submittedAt/);
 assert.match(js,/photoPaths/);
 assert.match(js,/Promise[.]race/);
 assert.match(js,/照片讀取逾時/);
 assert.match(js,/getBlob\(ref\(storage,path\)/);
 for(const disallowed of ["setDoc(","addDoc(","deleteDoc(","updateDoc(","writeBatch(","getDownloadURL("])
  assert.ok(!js.includes(disallowed),"Teacher must be read-only: "+disallowed);
 assert.match(cfg,/activityId:"taipei2026rehearsal"/);
 assert.match(cfg,/enabled:true/);
 assert.match(readFileSync(root+"phase2-student-quest.js","utf8"),/window[.]cloudQuestShowSharedMission/);
 assert.match(readFileSync(root+"phase2-shared-results.js","utf8"),/getBlob/);
 assert.equal(readFileSync("phase2-event-config.js","utf8").includes("enabled:false"),true);
});
