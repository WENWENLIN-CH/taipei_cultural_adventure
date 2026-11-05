// Locally add an isolated mobile rehearsal activity to the currently deployed
// Phase2 rules. Refuses to proceed if production rules differ from saved baseline.
// Read-only Firebase API, local file writes only; never deploys.
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {join,resolve} from "node:path";
const dir=resolve(".phase2-live-rules-backup"),project="taipei-cultural-adventure";
const sha=s=>createHash("sha256").update(s).digest("hex");
const data={};
for(const kind of ["firestore","storage"])data[kind]=await readFile(join(dir,"merged-"+kind+".rules"),"utf8");
if(!data.firestore.includes("taipei2026")||!data.storage.includes("taipei2026")||
 data.firestore.includes("taipei2026rehearsal")||data.storage.includes("taipei2026rehearsal"))
 throw Error("Unexpected base rules: stop and inspect the saved Phase2 rules");
const token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8"}).trim();
const root="https://firebaserules.googleapis.com/v1/";
async function get(url){
 const r=await fetch(url,{headers:{Authorization:"Bearer "+token},redirect:"error"});
 if(!r.ok)throw Error("Live rules READ failed: HTTP "+r.status);
 return r.json();
}
for(const [kind,name] of [
 ["firestore","cloud.firestore"],
 ["storage","firebase.storage/taipei-cultural-adventure.firebasestorage.app"]
]){
 const release=await get(root+"projects/"+project+"/releases/"+name);
 const ruleset=await get(root+release.rulesetName);
 const files=ruleset.source?.files||[];
 if(files.length!==1||sha(files[0].content)!==sha(data[kind]))
  throw Error(kind+": LIVE rules changed since previous deployment. DO NOT continue.");
}
function exactly(s,old,replacement,label){
 const n=s.split(old).length-1;
 if(n!==1)throw Error("Ambiguous "+label+" anchor: "+n);
 return s.replace(old,replacement);
}
let fs=data.firestore;
fs=exactly(fs,
 "activityId != 'taipei2026' || get(/databases/$(database)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true",
 "(activityId != 'taipei2026' && activityId != 'taipei2026rehearsal') || get(/databases/$(database)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true",
 "Firestore revocation");
fs=exactly(fs,
 "(activityId != 'taipei2026' && isMember(activityId,groupId))",
 "((activityId != 'taipei2026' && activityId != 'taipei2026rehearsal') && isMember(activityId,groupId))",
 "Protect rehearsal QR group document");
fs=exactly(fs,
 "allow create: if activityId != 'taipei2026' && signedIn()",
 "allow create: if activityId != 'taipei2026' && activityId != 'taipei2026rehearsal' && signedIn()",
 "Prohibit rehearsal client group creation");
fs=exactly(fs,
 "activityId != 'taipei2026' || resource.data.get('revoked', false) != true",
 "(activityId != 'taipei2026' && activityId != 'taipei2026rehearsal') || resource.data.get('revoked', false) != true",
 "Prohibit revoked rehearsal member reads");
let st=data.storage;
st=exactly(st,
 "activityId != 'taipei2026' || firestore.get(/databases/(default)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true",
 "(activityId != 'taipei2026' && activityId != 'taipei2026rehearsal') || firestore.get(/databases/(default)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true",
 "Storage rehearsal member");
const anchor="        && photoKey(missionId, filename)";
if(st.split(anchor).length!==2)throw Error("Storage photo scope anchor changed");
const pos=st.indexOf(anchor),before=st.slice(0,pos);
if(!/\)\s*$/.test(before))throw Error("Storage allowlist format changed");
const close=before.lastIndexOf(")");
const additional=" || (activityId == 'taipei2026rehearsal' && (groupId == 'group01' || groupId == 'group02' || groupId == 'group03') && (missionId == '1' || missionId == '2' || missionId == '3' || missionId == '4' || missionId == '5'))";
st=st.slice(0,close)+additional+st.slice(close);
async function writeCandidate(kind,content){
 const target=join(dir,"rehearsal-"+kind+".rules");
 try{
  const existing=await readFile(target,"utf8");
  if(existing!==content)throw Error("Candidate already exists and differs: "+kind);
 }catch(e){
  if(e.code!=="ENOENT")throw e;
  await writeFile(target,content,{flag:"wx",mode:0o600});
 }
}
await writeCandidate("firestore",fs);
await writeCandidate("storage",st);
console.log(JSON.stringify({
 mode:"READ_ONLY_CLOUD_LOCAL_WRITE",
 productionActivity:"taipei2026 unchanged",
 rehearsalActivity:"taipei2026rehearsal",
 baseSha:{firestore:sha(data.firestore),storage:sha(data.storage)},
 candidateSha:{firestore:sha(fs),storage:sha(st)},
 files:[".phase2-live-rules-backup/rehearsal-firestore.rules",
  ".phase2-live-rules-backup/rehearsal-storage.rules"],
 deployed:false
},null,2));
