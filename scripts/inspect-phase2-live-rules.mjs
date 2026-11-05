// READ-ONLY: reports deployed Firebase Rules releases without printing rules or tokens.
// Uses the currently signed-in Cloud Shell gcloud credentials.
// This script performs HTTP GETs only. It creates/deploys/updates nothing.
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const project="taipei-cultural-adventure";
if(process.argv.length!==2)throw Error("No arguments accepted");
for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"])
 if(process.env[key])throw Error("Unset local emulator variables before inspecting deployed rules");
const token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
if(!token)throw Error("Cloud Shell is not authenticated");
const root="https://firebaserules.googleapis.com/v1/";
async function read(endpoint){
 const r=await fetch(root+endpoint,{headers:{Authorization:"Bearer "+token},redirect:"error"});
 if(!r.ok)throw Error("Firebase Rules read-only request failed: HTTP "+r.status);
 return r.json();
}
let next="",releases=[];
do{
 const p=await read("projects/"+project+"/releases?pageSize=100"+(next?"&pageToken="+encodeURIComponent(next):""));
 releases.push(...(p.releases||[]));next=p.nextPageToken||"";
}while(next);
const relevant=releases.filter(x=>/\/releases\/(cloud[.]firestore|firebase[.]storage)(\/|$)/.test(x.name));
if(!relevant.length)throw Error("No Firestore or Storage rules releases returned; check permissions and project");
for(const release of relevant){
 if(!/^projects\/taipei-cultural-adventure\/rulesets\/[A-Za-z0-9_-]+$/.test(release.rulesetName))
  throw Error("Unexpected Ruleset name format");
 const ruleset=await read(release.rulesetName);
 const source=(ruleset.source?.files||[]).map(f=>f.content||"").join("\n");
 const sha=createHash("sha256").update(source).digest("hex");
 const checks={
  groupMembershipGuard:/members/.test(source),
  teacherAuthorization:/teacherAccess/.test(source),
  phase2ActivityExplicit:/taipei2026/.test(source),
  allowAllDanger:/allow\s+(read|write|create|update|delete)\s*:\s*if\s+true\s*;/.test(source)
 };
 console.log(JSON.stringify({
  release:release.name,updated:release.updateTime||"unknown",
  rulesSha256:sha,checks
 },null,2));
}
console.log("READ ONLY: verified current release metadata. No secrets or complete rules printed.");
