// Prepare ONLY the official student + read-only teacher site.
// Build-only, never deploys, keeps source config locked and QR secrets offline.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),preview=join(root,".firebase-preview");
const output=join(root,".firebase-phase2-official-hosting");
const expected=[
 "phase2-student-quest.html","phase2-student-quest.js",
 "phase2-student-bootstrap.js","phase2-submission.js",
 "phase2-event-config.js","phase2-qr-link.js","firebase-auth.js","firebase-config.js",
 "group-service.js","mission-cloud-flow.js","mission-upload-recovery.js",
 "mission-form-adapter.js","photo-upload.js","photo-retry-policy.js",
 "mission-submission.js","mission-schema.js","style.css",
 "teacher-dashboard.html","teacher-dashboard.js"
];
execFileSync(process.execPath,["scripts/build-phase2-student-preview.mjs"],{cwd:root,stdio:"inherit"});
const sourceConfig=await readFile(join(root,"phase2-event-config.js"),"utf8");
if(!sourceConfig.includes('enabled:false')||!sourceConfig.includes('activityId:"taipei2026"')||
 sourceConfig.includes("joinCallable:")||sourceConfig.includes("submitCallable:"))
 throw Error("Refusing to package: official source config must remain locked");
const generatedConfig=sourceConfig.replace("enabled:false","enabled:true");
if(!generatedConfig.includes('enabled:true')||!generatedConfig.includes('activityId:"taipei2026"'))
 throw Error("Invalid official client config");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of expected){
 const from=file.startsWith("teacher-dashboard")?root:preview;
 await copyFile(join(from,file),join(output,file));
}
await writeFile(join(output,"phase2-event-config.js"),generatedConfig);
const teacherHtmlPath=join(output,"teacher-dashboard.html");
let teacherHtml=await readFile(teacherHtmlPath,"utf8");
teacherHtml=teacherHtml.replaceAll("台北島｜教師成果檢視（測試）","台北島｜教師成果檢視")
 .replace("測試版 · 僅讀取 · 需要教師資料庫授權","正式活動 · 僅讀取 · 需要教師資料庫授權")
 .replaceAll(/<option value="(?:demo2026|pilot2026|phase2sandbox|taipei2026rehearsal)">[^<]*<\/option>/g,"")
 .replace("demo2026 · 小組進度","taipei2026 · 小組進度")
 .replace("本頁只用於測試","本頁僅供授權教師使用");
if(!teacherHtml.includes('<option value="taipei2026">')||teacherHtml.includes("taipei2026rehearsal"))
 throw Error("Official teacher activity selector unsafe");
await writeFile(teacherHtmlPath,teacherHtml);
const teacherJsPath=join(output,"teacher-dashboard.js");
let teacherJs=await readFile(teacherJsPath,"utf8");
teacherJs=teacherJs.replace('const ALLOWED_ACTIVITIES=Object.freeze(["demo2026","pilot2026","phase2sandbox","taipei2026","taipei2026rehearsal"]);',
 'const ALLOWED_ACTIVITIES=Object.freeze(["taipei2026"]);')
 .replace('let activityId="demo2026";','let activityId="taipei2026";');
if(!teacherJs.includes('ALLOWED_ACTIVITIES=Object.freeze(["taipei2026"])')||
 !teacherJs.includes('let activityId="taipei2026"'))
 throw Error("Official teacher scope unsafe");
await writeFile(teacherJsPath,teacherJs);
const studentHtmlPath=join(output,"phase2-student-quest.html");
let studentHtml=await readFile(studentHtmlPath,"utf8");
const lockedText="本頁目前為開放前測試版，尚不接受加入或提交。活動開放後，掃描老師提供的小組 QR Code 即可自動加入。";
if(!studentHtml.includes(lockedText))throw Error("Official student activation notice mismatch");
studentHtml=studentHtml.replace(lockedText,
 "掃描老師提供的小組 QR Code 即可自動加入；同組共享闖關進度，每關共同提交一份成果。");
await writeFile(studentHtmlPath,studentHtml);
const studentJs=await readFile(join(output,"phase2-student-quest.js"),"utf8");
if(studentHtml.includes("酒泉街謎題")||studentHtml.includes("五關完成自動解鎖圓山")||
 !studentHtml.includes("神秘的最終任務")||
 studentJs.includes('data-key="${field.key}_restaurant"'))
 throw Error("Official preview contains spoiler or obsolete form");
const names=await readdir(output);
if(names.length!==expected.length||expected.some(x=>!names.includes(x)))
 throw Error("Unexpected official Hosting files");
console.log("BUILT: OFFICIAL candidate with active QR autojoin and read-only taipei2026 teacher dashboard.");
console.log("NOT DEPLOYED. Source student config remains disabled. No official QR secrets packaged.");
