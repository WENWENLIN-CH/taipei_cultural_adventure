// READ-ONLY live drift preflight: refuse deploy when the current production
// rules do not match the already audited local backups. No writes or deployment.
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
const PROJECT="taipei-cultural-adventure";
const dir=resolve(".phase2-live-rules-backup");
const expected={
 firestore:"4da16b5e5760d7ec076fdf62f2d5ad1a39654ddb20a293f6facb9d34221f0a9e",
 storage:"17d95cab3ea0ccefdc2334af573b22372e02a8f1f4febd00fa33a32ed4535625"
};
if(process.argv.length!==2)throw Error("No arguments supported");
for(const name of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST"])
 if(process.env[name])throw Error("Unexpected emulator environment");
const sha=x=>createHash("sha256").update(x).digest("hex");
const token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
async function fetchRules(url){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token},redirect:"error"});
 if(!response.ok)throw Error("Rules API read failed with HTTP "+response.status);
 return response.json();
}
const root="https://firebaserules.googleapis.com/v1/";
for(const [kind,releaseName] of [
 ["firestore",`projects/${PROJECT}/releases/cloud.firestore`],
 ["storage",`projects/${PROJECT}/releases/firebase.storage/taipei-cultural-adventure.firebasestorage.app`]
]){
 const local=await readFile(join(dir,kind+".rules"),"utf8");
 const merged=await readFile(join(dir,"merged-"+kind+".rules"),"utf8");
 if(sha(local)!==expected[kind])throw Error(kind+": local baseline SHA mismatch");
 if(!merged.includes("taipei2026")||merged===local)throw Error(kind+": no Phase2 merge found");
 const release=await fetchRules(root+releaseName);
 if(!new RegExp("^projects/"+PROJECT+"/rulesets/[A-Za-z0-9_-]+$").test(release.rulesetName))
  throw Error(kind+": unrecognized live ruleset");
 const live=await fetchRules(root+release.rulesetName);
 const files=live.source?.files||[];
 if(files.length!==1)throw Error(kind+": unexpected rule file count");
 if(sha(files[0].content)!==expected[kind])
  throw Error(kind+": LIVE RULES HAVE CHANGED. STOP, refresh backup and re-review.");
 console.log(kind+": VERIFIED unchanged live rules; merged candidate ready");
}
console.log("PASS: read-only production rules drift check; NO DEPLOYMENT performed.");
