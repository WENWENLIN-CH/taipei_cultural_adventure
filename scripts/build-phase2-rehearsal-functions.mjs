// Build-only separate rehearsal Functions codebase (no deploy).
import {copyFile,mkdir,rm,readFile,writeFile,readdir} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),target=join(root,".firebase-phase2-rehearsal-functions"),src=join(root,"functions");
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const name of ["submission-handler.js","submission-core.js","pilot-scope.js","phase2-join-handler.js"])
 await copyFile(join(src,name),join(target,name));
await copyFile(join(src,"phase2-rehearsal-live-entry.js"),join(target,"index.js"));
const pkg=JSON.parse(await readFile(join(src,"package.json"),"utf8"));
await writeFile(join(target,"package.json"),JSON.stringify({
 name:"taipei-phase2-rehearsal-only",type:"module",private:true,
 main:"index.js",engines:{node:"22"},
 dependencies:{"firebase-admin":pkg.dependencies["firebase-admin"],
 "firebase-functions":pkg.dependencies["firebase-functions"]}
},null,2)+"\n");
const code=await readFile(join(target,"index.js"),"utf8");
const names=[...code.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
if(JSON.stringify(names)!==JSON.stringify(["joinPhase2RehearsalGroup","submitPhase2RehearsalMission"])||
 code.includes('ACTIVITY="taipei2026"')||(await readdir(target)).length!==6)
 throw Error("Rehearsal package safety check failed");
console.log("READY: isolated rehearsal functions package. NOT DEPLOYED.");
