// Read-only backup of the CURRENT live Firebase Rules releases.
// Never prints access tokens, QR secrets or full rule sources.
// Files are local and ignored by Git; no production writes/deployments.
import {execFileSync} from "node:child_process";
import {mkdir,open} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
const project="taipei-cultural-adventure";
if(process.argv.length!==2)throw Error("No arguments accepted");
for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"])
 if(process.env[key])throw Error("Unset emulator environment variables");
const token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8"}).trim();
if(!token)throw Error("Missing authenticated Cloud Shell credentials");
async function get(url){
 const result=await fetch(url,{headers:{Authorization:"Bearer "+token},redirect:"error"});
 if(!result.ok)throw Error("Read-only Firebase API error: HTTP "+result.status);
 return result.json();
}
const root="https://firebaserules.googleapis.com/v1/";
const releases=[],dir=resolve(".phase2-live-rules-backup");
let pageToken="";
do{
 const page=await get(root+"projects/"+project+"/releases?pageSize=100"+(pageToken?"&pageToken="+encodeURIComponent(pageToken):""));
 releases.push(...(page.releases||[]));
 pageToken=page.nextPageToken||"";
}while(pageToken);
const names=[
 ["firestore",`projects/${project}/releases/cloud.firestore`],
 ["storage",`projects/${project}/releases/firebase.storage/taipei-cultural-adventure.firebasestorage.app`]
];
const selection=names.map(([label,name])=>({label,release:releases.find(item=>item.name===name)}));
if(selection.some(x=>!x.release))throw Error("Required live Rules release missing: no backups written");
const results=[];
for(const {label,release} of selection){
 if(!new RegExp("^projects/"+project+"/rulesets/[A-Za-z0-9_-]+$").test(release.rulesetName))
  throw Error("Unexpected Ruleset identifier");
 const source=await get(root+release.rulesetName);
 const files=source.source?.files||[];
 if(files.length!==1||typeof files[0]?.content!=="string")
  throw Error("Unexpected multi-file or empty Ruleset; no backup written");
 results.push({label,release:release.name,updated:release.updateTime||"",
  text:files[0].content,sha:createHash("sha256").update(files[0].content).digest("hex")});
}
await mkdir(dir,{recursive:true,mode:0o700});
for(const r of results){
 const f=await open(join(dir,r.label+".rules"),"wx",0o600);
 try{await f.writeFile(r.text);}finally{await f.close();}
 console.log(r.label+": backed up live rules, sha256="+r.sha+", updated="+r.updated);
}
console.log("READ ONLY. Private backups: .phase2-live-rules-backup/{firestore,storage}.rules");
console.log("Do NOT paste full private files or share raw QR secrets.");
