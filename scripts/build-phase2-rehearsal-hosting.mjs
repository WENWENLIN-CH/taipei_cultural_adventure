// Build a PRIVATE Hosting preview for isolated mobile rehearsal.
// This output MUST be deployed to a temporary Hosting preview CHANNEL, not live.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),preview=join(root,".firebase-preview"),out=join(root,".firebase-phase2-rehearsal-hosting");
execFileSync(process.execPath,["scripts/build-phase2-student-preview.mjs"],{cwd:root,stdio:"inherit"});
const files=[
 "phase2-student-quest.html","phase2-student-quest.js",
 "phase2-student-bootstrap.js","phase2-submission.js",
 "phase2-event-config.js","phase2-qr-link.js",
 "firebase-auth.js","firebase-config.js","group-service.js",
 "mission-cloud-flow.js","mission-upload-recovery.js",
 "mission-form-adapter.js","photo-upload.js","photo-retry-policy.js",
 "mission-submission.js","mission-schema.js","style.css",
 "teacher-dashboard.html","teacher-dashboard.js"
];
const base=await readFile(join(preview,"phase2-event-config.js"),"utf8");
if(!base.includes('enabled:false')||!base.includes('activityId:"taipei2026"'))
 throw Error("Unexpected student release config");
const config=base.replace("enabled:false","enabled:true").replace('activityId:"taipei2026"','activityId:"taipei2026rehearsal"')
 .replace(' groups:Object.freeze(["group01","group02","group03"])',' joinCallable:"joinPhase2RehearsalGroup",\n submitCallable:"submitPhase2RehearsalMission",\n groups:Object.freeze(["group01","group02","group03"])');
if(!config.includes('joinCallable:"joinPhase2RehearsalGroup"')||
 !config.includes('submitCallable:"submitPhase2RehearsalMission"'))
 throw Error("Rehearsal callable binding failed");
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const file of files){
 const from=["teacher-dashboard.html","teacher-dashboard.js"].includes(file)?root:preview;
 await copyFile(join(from,file),join(out,file));
}
await writeFile(join(out,"phase2-event-config.js"),config);
const htmlPath=join(out,"phase2-student-quest.html");
let html=await readFile(htmlPath,"utf8");
html=html.replace(
 "本頁目前為開放前測試版，尚不接受加入或提交。活動開放後，掃描老師提供的小組 QR Code 即可自動加入。",
 "🧪 手機實測專用：只使用測試 QR Code；不會加入正式的三組學生。");
html=html.replace("目前是開放前測試版，尚未開放學生加入。","手機實測活動");
if(!html.includes("🧪 手機實測專用"))throw Error("Rehearsal banner missing");
await writeFile(htmlPath,html);
if((await readdir(out)).length!==files.length||!config.includes('enabled:true'))
 throw Error("Rehearsal files mismatch");
const teacher=await readFile(join(out,"teacher-dashboard.html"),"utf8");
if(!teacher.includes('value="taipei2026rehearsal"')||
 !(await readFile(join(out,"teacher-dashboard.js"),"utf8")).includes('"taipei2026rehearsal"'))
 throw Error("Teacher rehearsal activity missing");
console.log("READY: private rehearsal Hosting preview with read-only teacher dashboard. DO NOT deploy to live Hosting.");
