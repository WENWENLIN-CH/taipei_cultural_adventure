// Combine every same-origin preview artifact, no deployment.
// Build the five-quest page first and then the teacher/pilot collection.
// All builders are intentionally non-deploying; this preserves S02's existing
// origin when publishing to the pre-existing auth-test preview channel.
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {resolve,join} from "node:path";

const root=resolve(".");
for(const script of ["scripts/build-pilot2026-rehearsal.mjs","scripts/build-pilot2026-cloud-preview.mjs","scripts/build-pilot2026-stage1-live-preview.mjs","scripts/build-teacher-preview.mjs"]){
 execFileSync(process.execPath,[script],{cwd:root,stdio:"inherit"});
}
const dir=join(root,".firebase-preview");
const expected=["pilot2026-stage1-live-quest.html","pilot2026-stage1-live-quest.js","pilot2026-stage1-live-bootstrap.js","pilot2026-cloud-quest.html","pilot2026-cloud-quest.js","pilot2026-cloud-bootstrap.js","pilot2026-stage1-submission.js","pilot2026-rehearsal.html","pilot2026-rehearsal.js","pilot2026-rehearsal-bootstrap.js","five-quest.html","five-quest.js","cloud-quest.html","cloud-quest.js","pilot-quest.html",
 "cloud-quest-bootstrap.js","cloud-quest-pilot-bootstrap.js","teacher-dashboard.html","teacher-dashboard.js",
 "mission-cloud-flow.js","mission-upload-recovery.js","photo-upload.js"];
for(const path of expected){
 const contents=await readFile(join(dir,path),"utf8");
 if(contents.length<40)throw Error("Missing or empty combined preview file: "+path);
}
const preview=await readFile(join(dir,"cloud-quest-bootstrap.js"),"utf8");
const pilot=await readFile(join(dir,"cloud-quest-pilot-bootstrap.js"),"utf8");
const five=await readFile(join(dir,"five-quest.html"),"utf8");
if(!preview.includes("const SUBMISSIONS_ENABLED=false;") ||
 !pilot.includes("const SUBMISSIONS_ENABLED=true;") ||
 !pilot.includes('const PILOT_GROUP="group01";') ||
 !pilot.includes("const PILOT_MISSION=3;") ||
 !five.includes('src="cloud-quest-bootstrap.js"'))
 throw Error("Unsafe combined preview: the read-only or restricted-pilot guard changed");
const stage1=await readFile(join(dir,"pilot2026-stage1-live-bootstrap.js"),"utf8");
const stage1Js=await readFile(join(dir,"pilot2026-stage1-live-quest.js"),"utf8");
if(!stage1.includes("const SUBMISSIONS_ENABLED=true;") ||
 !stage1.includes('const STAGE1_GROUP="group01";') ||
 !stage1.includes("const STAGE1_MISSION=1;") ||
 !stage1Js.includes("將上傳 1 張測試照片") ||
 !(await readFile(join(dir,"pilot2026-cloud-bootstrap.js"),"utf8")).includes("const SUBMISSIONS_ENABLED=false;"))
 throw Error("Unsafe pilot2026 stage1 activation detected");
console.log("PASS: pilot2026 cloud preview, rehearsal, five-quest, prior pilot and teacher preview coexist. BUILD ONLY, NOT DEPLOYED.");
