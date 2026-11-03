// Build only an isolated authentication test page for Firebase Hosting preview.
// Never deploy the whole repository or the real student quest in this stage.
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=join(root,".firebase-preview");
await mkdir(output,{recursive:true});
for(const [source,target] of [
  ["firebase-test.html","index.html"],
  ["firebase-auth.js","firebase-auth.js"],
  ["firebase-config.js","firebase-config.js"],
  ["group-test.html","group-test.html"],
  ["group-service.js","group-service.js"]
]){
  await copyFile(join(root,source),join(output,target));
}
console.log("Created isolated Firebase Hosting preview containing login test files only.");
