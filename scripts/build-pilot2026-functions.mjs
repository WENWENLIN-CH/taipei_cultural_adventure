// Build a separately deployable pilot2026 codebase; NEVER deploy here.
// Keep the old pilot-submit codebase and submitGroupMission untouched.
import {readFile,writeFile,copyFile,mkdir,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),target=join(root,".firebase-pilot2026-functions");
const source=join(root,"functions");
const files=["submission-handler.js","submission-core.js","pilot-scope.js","pilot2026-authorization.js"];
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const filename of files)await copyFile(join(source,filename),join(target,filename));
await copyFile(join(source,"pilot2026-stage1-entry.js"),join(target,"index.js"));
const pkg=JSON.parse(await readFile(join(source,"package.json"),"utf8"));
const output={
 name:"taipei-isolated-pilot2026-stage1",
 private:true,type:"module",engines:{node:"22"},main:"index.js",
 dependencies:{"firebase-admin":pkg.dependencies["firebase-admin"],"firebase-functions":pkg.dependencies["firebase-functions"]}
};
await writeFile(join(target,"package.json"),JSON.stringify(output,null,2)+"\n");
const index=await readFile(join(target,"index.js"),"utf8");
if(!index.includes("export const submitPilot2026Stage1=onCall(") ||
 index.includes("submitGroupMission") ||
 index.includes('from "./index.js"'))throw Error("Unsafe pilot2026 codebase entry");
const names=(await import("node:fs")).readdirSync(target).sort();
if(names.length!==6)throw Error("Unexpected files in isolated pilot source: "+names);
console.log("READY: independent pilot2026 function codebase built. NO deployment. submitGroupMission is NOT packaged.");
