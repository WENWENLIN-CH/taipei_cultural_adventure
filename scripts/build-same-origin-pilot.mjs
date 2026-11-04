// Builds two pages under the SAME Hosting origin, so an existing anonymous
// Firebase identity (S02) can be reused without copying credentials.
// Never deploys; the normal cloud-quest.html remains submission-disabled.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {join,resolve} from "node:path";

const root=resolve(".");
execFileSync(process.execPath,["scripts/build-pilot-preview.mjs"],{cwd:root,stdio:"inherit"});
const readOnly=join(root,".firebase-preview");
const pilot=join(root,".firebase-pilot-preview");
const normalBootstrap=await readFile(join(readOnly,"cloud-quest-bootstrap.js"),"utf8");
const pilotBootstrap=await readFile(join(pilot,"cloud-quest-bootstrap.js"),"utf8");
if(!normalBootstrap.includes("const SUBMISSIONS_ENABLED=false;"))
  throw Error("Normal page is not read-only");
if(!pilotBootstrap.includes("const SUBMISSIONS_ENABLED=true;"))
  throw Error("Pilot page is not submission-enabled");
if(!pilotBootstrap.includes('const PILOT_GROUP="group01";') ||
   !pilotBootstrap.includes("const PILOT_MISSION=3;"))
  throw Error("Pilot scope has changed");
const newBootstrap=pilotBootstrap.replace(
 "目前模式：僅共享進度預覽，禁止正式提交",
 "目前模式：第一組第三關受控提交測試"
);
await writeFile(join(readOnly,"cloud-quest-pilot-bootstrap.js"),newBootstrap);
const originalPilotHTML=await readFile(join(pilot,"cloud-quest.html"),"utf8");
const oldSrc='src="cloud-quest-bootstrap.js"';
if(!originalPilotHTML.includes(oldSrc))throw Error("Pilot script reference missing");
const pilotPage=originalPilotHTML.replace(oldSrc,'src="cloud-quest-pilot-bootstrap.js"');
await writeFile(join(readOnly,"pilot-quest.html"),pilotPage);
console.log("SAME-ORIGIN preview built; cloud-quest.html is read-only, pilot-quest.html enables ONLY demo2026/group01/mission3.");
console.log("No Hosting channel or production website has been deployed.");
