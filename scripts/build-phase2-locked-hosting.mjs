// Build only the locked Phase2 student site, isolated from legacy pages.
// No Firebase deployment and no changes to production activity data.
import {execFileSync} from "node:child_process";
import {readFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),preview=join(root,".firebase-preview");
const output=join(root,".firebase-phase2-student-hosting");
execFileSync(process.execPath,["scripts/build-phase2-student-preview.mjs"],{cwd:root,stdio:"inherit"});
const names=[
 "phase2-student-quest.html","phase2-student-quest.js",
 "phase2-student-bootstrap.js","phase2-submission.js",
 "phase2-event-config.js","phase2-qr-link.js",
 "firebase-auth.js","firebase-config.js","group-service.js",
 "mission-cloud-flow.js","mission-upload-recovery.js",
 "mission-form-adapter.js","photo-upload.js","photo-retry-policy.js",
 "mission-submission.js","mission-schema.js","style.css"
];
const config=await readFile(join(preview,"phase2-event-config.js"),"utf8");
if(!/enabled\s*:\s*false\b/.test(config)||/enabled\s*:\s*true\b/.test(config))
 throw Error("Refusing to build an active student site before phone validation");
const html=await readFile(join(preview,"phase2-student-quest.html"),"utf8");
if(!html.includes('src="phase2-student-bootstrap.js"'))
 throw Error("Student entrypoint missing");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of names)await copyFile(join(preview,name),join(output,name));
const copied=await readdir(output);
if(copied.length!==names.length||names.some(x=>!copied.includes(x)))
 throw Error("Student hosting file allowlist mismatch");
console.log("READY: locked Phase2 student Hosting page. NOT DEPLOYED. No teacher or pilot pages included.");
