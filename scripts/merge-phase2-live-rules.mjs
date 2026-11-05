// Generate a narrowly scoped Phase2 merge FROM EXACT live backup files.
// Offline only. All original text retained except the explicit small changes.
// No deployment, no source printed, and refuses unknown live rules versions.
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
const dir=resolve(".phase2-live-rules-backup");
const sha=s=>createHash("sha256").update(s).digest("hex");
const expected={
 firestore:"4da16b5e5760d7ec076fdf62f2d5ad1a39654ddb20a293f6facb9d34221f0a9e",
 storage:"17d95cab3ea0ccefdc2334af573b22372e02a8f1f4febd00fa33a32ed4535625"
};
function once(s,old,newText,why){
 const count=s.split(old).length-1;
 if(count!==1)throw Error("Refusing unsafe merge: "+why+" anchor occurred "+count+" times");
 return s.replace(old,newText);
}
async function original(kind){
 const text=await readFile(join(dir,kind+".rules"),"utf8");
 if(sha(text)!==expected[kind])throw Error(kind+" backup does not match verified LIVE rules; refusing merge");
 return text;
}
const firestoreBefore=await original("firestore");
const storageBefore=await original("storage");
// EXISTING legacy isMember remains unchanged for ALL other activities.
// In Phase2, a revoked member cannot continue reading or accessing own records.
let firestore=once(firestoreBefore,
 "return signedIn() && exists(/databases/$(database)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid));",
 "return signedIn() && exists(/databases/$(database)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid))\n        && (activityId != 'taipei2026' || get(/databases/$(database)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true);",
 "Firestore isMember");
firestore=once(firestore,
 "allow get: if isMember(activityId,groupId) || isTeacher();",
 "allow get: if (activityId != 'taipei2026' && isMember(activityId,groupId)) || isTeacher();",
 "Hide private QR hash in Phase2 group docs");
firestore=once(firestore,
 "allow create: if signedIn() && request.auth.uid == uid",
 "allow create: if activityId != 'taipei2026' && signedIn() && request.auth.uid == uid",
 "Phase2 membership via server callable only");
firestore=once(firestore,
 "allow get: if (signedIn() && request.auth.uid == uid) || isTeacher();",
 "allow get: if (signedIn() && request.auth.uid == uid && (activityId != 'taipei2026' || resource.data.get('revoked', false) != true)) || isTeacher();",
 "Revoked Phase2 member private record");
if(!firestore.includes("taipei2026"))throw Error("Phase2 Firestore activation not present");
// Storage: preserve every original permission for existing activities.
// Only add revocation and exact three-group/five-mission scope for taipei2026.
let storage=once(storageBefore,
 "firestore.exists(/databases/(default)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid));",
 "firestore.exists(/databases/(default)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid))\n        && (activityId != 'taipei2026' || firestore.get(/databases/(default)/documents/activities/$(activityId)/groups/$(groupId)/members/$(request.auth.uid)).data.get('revoked', false) != true);",
 "Storage member");
// Inject only within preexisting create scope, immediately before photoKey.
// Leave demo and pilot conditional verbatim.
const beforePhotoKey="        && photoKey(missionId, filename)";
const pos=storage.indexOf(beforePhotoKey);
if(pos<0||storage.indexOf(beforePhotoKey,pos+1)!==-1)
 throw Error("Storage photo authorization anchor changed");
const prefix=storage.slice(0,pos);
const match=prefix.match(/(\s*\)\s*)$/);
if(!match)throw Error("Expected existing activity expression before photoKey");
const closePos=pos-match[1].length;
const addition=" || (activityId == 'taipei2026' && (groupId == 'group01' || groupId == 'group02' || groupId == 'group03') && (missionId == '1' || missionId == '2' || missionId == '3' || missionId == '4' || missionId == '5'))";
storage=storage.slice(0,closePos)+addition+storage.slice(closePos);
if(!storage.includes("taipei2026"))throw Error("Phase2 Storage allowlist not added");
async function keepOrWrite(name,content){
 const path=join(dir,name);
 try{
  const existing=await readFile(path,"utf8");
  if(existing!==content)throw Error(name+" has unexpected content; refusing overwrite");
 }catch(error){
  if(error.code!=="ENOENT")throw error;
  await writeFile(path,content,{flag:"wx",mode:0o600});
 }
}
await keepOrWrite("merged-firestore.rules",firestore);
await keepOrWrite("merged-storage.rules",storage);
console.log(JSON.stringify({
 mode:"LOCAL_MERGE_NO_DEPLOY",
 sourceHashes:expected,
 generated:[".phase2-live-rules-backup/merged-firestore.rules",".phase2-live-rules-backup/merged-storage.rules"],
 originalPreserved:true,
 scope:"taipei2026 group01-group03 missions1-5",
 privacy:"Student group doc GET denied to protect QR secret",
 legacy:"demo2026/pilot2026 branches unchanged",
 mergeHashes:{firestore:sha(firestore),storage:sha(storage)}
},null,2));
