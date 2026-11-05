// Build an independent Functions Emulator package; NEVER deploy this test entry.
import {readFile,writeFile,copyFile,mkdir,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),src=join(root,"functions"),target=join(root,".firebase-phase2-callable-emulator");
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const file of ["submission-handler.js","submission-core.js","pilot-scope.js","phase2-join-handler.js","phase2-integrated-candidate.js","phase2-prerequisite.js","phase2-authorization.js"])
 await copyFile(join(src,file),join(target,file));
await copyFile(join(src,"phase2-callable-emulator-entry.js"),join(target,"index.js"));
const p=JSON.parse(await readFile(join(src,"package.json"),"utf8"));
await writeFile(join(target,"package.json"),JSON.stringify({
 name:"phase2-callable-emulator-only",private:true,type:"module",main:"index.js",
 engines:{node:"22"},dependencies:p.dependencies
},null,2)+"\n");
console.log("BUILT isolated emulator-only callable package. NOT DEPLOYED.");
