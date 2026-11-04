// Creates a teacher-only preview artifact while preserving existing S02 pages.
// Build only; does not deploy anything.
import {execFileSync} from "node:child_process";
import {copyFile,readFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve(".");
execFileSync(process.execPath,["scripts/build-same-origin-pilot.mjs"],{cwd:root,stdio:"inherit"});
const output=join(root,".firebase-preview");
for(const path of ["teacher-dashboard.html","teacher-dashboard.js"]){
 await copyFile(join(root,path),join(output,path));
}
const dashboard=await readFile(join(output,"teacher-dashboard.html"),"utf8");
const client=await readFile(join(output,"teacher-dashboard.js"),"utf8");
if(!dashboard.includes('src="teacher-dashboard.js"'))throw Error("Teacher script not linked");
if(!client.includes('"teacherAccess",user.uid'))throw Error("Missing teacherAccess authorization check");
console.log("Teacher read-only preview BUILT, NOT DEPLOYED. Existing student and pilot pages preserved.");
