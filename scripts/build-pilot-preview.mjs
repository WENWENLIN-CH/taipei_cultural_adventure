// Build a SEPARATE opt-in pilot artifact. Does not deploy any website.
// The normal cloud-quest preview always keeps SUBMISSIONS_ENABLED=false.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,mkdir,readdir,copyFile} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve(".");
execFileSync(process.execPath,["scripts/build-cloud-quest-preview.mjs"],{cwd:root,stdio:"inherit"});
const source=join(root,".firebase-preview");
const dest=join(root,".firebase-pilot-preview");
await mkdir(dest,{recursive:true});
for (const item of await readdir(source,{withFileTypes:true})) {
  if (!item.isFile()) throw Error("Unexpected preview directory content");
  await copyFile(join(source,item.name),join(dest,item.name));
}
const path=join(dest,"cloud-quest-bootstrap.js");
const old=await readFile(path,"utf8");
const needle="const SUBMISSIONS_ENABLED=false;";
if(!old.includes(needle)) throw Error("Missing disabled-by-default submission gate");
const enabled=old.replace(needle,"const SUBMISSIONS_ENABLED=true;");
if(!enabled.includes('const PILOT_GROUP="group01";')||!enabled.includes("const PILOT_MISSION=3;"))
  throw Error("Pilot guard unexpectedly changed");
await writeFile(path,enabled);
const htmlPath=join(dest,"cloud-quest.html");
let html=await readFile(htmlPath,"utf8");
html=html.replace("此版只顯示共享進度，不接受正式任務提交。","僅供老師與測試組使用：目前只允許 demo2026 第一組第三關提交測試，請勿上傳學生可辨識照片。");
await writeFile(htmlPath,html);
console.log("PILOT BUILD CREATED, NOT DEPLOYED. Only demo2026 / group01 / mission 3 submit control is enabled in isolated .firebase-pilot-preview.");
