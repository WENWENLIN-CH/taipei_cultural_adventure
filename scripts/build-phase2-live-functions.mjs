// Build an isolated Functions package only; NEVER deploy automatically.
import {readFile,writeFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),src=join(root,"functions");
const target=join(root,".firebase-phase2-live-functions");
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const filename of ["submission-handler.js","submission-core.js","pilot-scope.js","phase2-join-handler.js"])
 await copyFile(join(src,filename),join(target,filename));
await copyFile(join(src,"phase2-live-entry.js"),join(target,"index.js"));
const pkg=JSON.parse(await readFile(join(src,"package.json"),"utf8"));
await writeFile(join(target,"package.json"),JSON.stringify({
 name:"taipei-phase2-isolated-functions",private:true,type:"module",
 engines:{node:"22"},main:"index.js",
 dependencies:{"firebase-admin":pkg.dependencies["firebase-admin"],"firebase-functions":pkg.dependencies["firebase-functions"]}
},null,2)+"\n");
const index=await readFile(join(target,"index.js"),"utf8");
const exported=[...index.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
if(JSON.stringify(exported)!==JSON.stringify(["submitPhase2Mission","joinPhase2Group"])||
 (await readdir(target)).length!==6||
 index.includes("submitPilot2026Stage")||index.includes("submitGroupMission"))
 throw Error("Unsafe Phase2 callable packaging");
console.log("READY: isolated Phase2 callable candidate. NOT DEPLOYED.");
