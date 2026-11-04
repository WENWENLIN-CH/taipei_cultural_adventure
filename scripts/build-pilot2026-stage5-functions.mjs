// Builds Stage5 Functions as a distinct candidate package. No deployment.
// Do NOT run firebase deploy without approval and Storage rule review.
import {readFile,writeFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),target=join(root,".firebase-pilot2026-stage5-functions"),src=join(root,"functions");
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const filename of ["submission-handler.js","submission-core.js","pilot-scope.js","pilot2026-stage5-authorization.js","pilot2026-stage5-prerequisite.js"])
 await copyFile(join(src,filename),join(target,filename));
await copyFile(join(src,"pilot2026-stage5-entry.js"),join(target,"index.js"));
const pkg=JSON.parse(await readFile(join(src,"package.json"),"utf8"));
await writeFile(join(target,"package.json"),JSON.stringify({
 name:"taipei-isolated-pilot2026-stage5",private:true,type:"module",
 engines:{node:"22"},main:"index.js",
 dependencies:{
  "firebase-admin":pkg.dependencies["firebase-admin"],
  "firebase-functions":pkg.dependencies["firebase-functions"]
 }
},null,2)+"\n");
const index=await readFile(join(target,"index.js"),"utf8");
const exported=[...index.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
if(JSON.stringify(exported)!==JSON.stringify(["submitPilot2026Stage5"]) ||
 index.includes("submitPilot2026Stage1")||index.includes("submitPilot2026Stage2")||
 index.includes("submitGroupMission")||(await readdir(target)).length!==7)
 throw Error("Unsafe Stage5 Function packaging");
console.log("READY: independent pilot2026-stage5 callable package. NOT DEPLOYED.");
