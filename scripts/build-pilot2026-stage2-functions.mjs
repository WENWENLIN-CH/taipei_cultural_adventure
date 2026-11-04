// Builds separately scoped Stage2 Firebase Function codebase. NEVER DEPLOYS.
// A separate codebase prevents Stage1 and demo function deletion/replacement.
import {readFile,writeFile,copyFile,mkdir,rm,readdir} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),target=join(root,".firebase-pilot2026-stage2-functions");
const source=join(root,"functions");
const copies=["submission-handler.js","submission-core.js","pilot-scope.js","pilot2026-stage2-authorization.js"];
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const name of copies)await copyFile(join(source,name),join(target,name));
await copyFile(join(source,"pilot2026-stage2-entry.js"),join(target,"index.js"));
const pkg=JSON.parse(await readFile(join(source,"package.json"),"utf8"));
await writeFile(join(target,"package.json"),JSON.stringify({
 name:"taipei-isolated-pilot2026-stage2",
 private:true,type:"module",engines:{node:"22"},main:"index.js",
 dependencies:{"firebase-admin":pkg.dependencies["firebase-admin"],"firebase-functions":pkg.dependencies["firebase-functions"]}
},null,2)+"\n");
const index=await readFile(join(target,"index.js"),"utf8");
const names=(await readdir(target)).sort();
const exports=[...index.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m=>m[1]);
if(JSON.stringify(exports)!==JSON.stringify(["submitPilot2026Stage2"]) ||
 index.includes("submitPilot2026Stage1") ||
 index.includes("submitGroupMission") ||
 names.length!==6)
 throw Error("Unsafe Stage2 Function packaging: "+JSON.stringify({exports,names}));
console.log("READY: separate codebase pilot2026-stage2, exports ONLY submitPilot2026Stage2. NOT DEPLOYED.");
