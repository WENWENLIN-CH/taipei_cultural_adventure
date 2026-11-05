// Create ONLY three isolated rehearsal groups; never touches taipei2026.
// Default dry-run. Live action requires explicit project, acknowledgement and ADC.
import {randomBytes,createHash} from "node:crypto";
import {open} from "node:fs/promises";
import {resolve} from "node:path";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
const project="taipei-cultural-adventure",activity="taipei2026rehearsal";
const groups=["group01","group02","group03"],file=".phase2-live-rules-backup/rehearsal-private.txt";
const opts=process.argv.slice(2),isApply=opts.includes("--apply");
if(!isApply){
 if(opts.length)throw Error("Only --apply supported");
 console.log(JSON.stringify({mode:"DRY_RUN",activity,groupIds:groups,capacityPerGroup:7,officialDataChanged:false},null,2));
}else{
 if(opts.join(" ")!=="--apply --confirm=CREATE_REHEARSAL_ONLY" ||
  process.env.ALLOW_PHASE2_REHEARSAL_CREATE!=="YES" ||
  process.env.GCLOUD_PROJECT!==project)
  throw Error("Rehearsal creation requires exact project and confirmation");
 for(const k of ["FIRESTORE_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST"])
  if(process.env[k])throw Error("Refusing cloud creation with emulator settings");
 const requireAdmin=createRequire(resolve("functions/package.json"));
 const {initializeApp,applicationDefault}=requireAdmin("firebase-admin/app");
 const {getFirestore,FieldValue}=requireAdmin("firebase-admin/firestore");
 const credential=applicationDefault();
 await credential.getAccessToken();
 initializeApp({projectId:project,credential});
 const db=getFirestore();
 const refs=groups.map(g=>db.doc(`activities/${activity}/groups/${g}`));
 const existing=await db.getAll(...refs);
 if(existing.some(x=>x.exists))throw Error("Rehearsal activity already exists, refusing overwrite");
 const keys=groups.map(g=>({groupId:g,code:randomBytes(24).toString("hex")}));
 const output=await open(resolve(file),"wx",0o600);
 try{
  await output.writeFile("PRIVATE REHEARSAL QR TOKENS - DO NOT UPLOAD\n"+
   keys.map(x=>x.groupId+"\t"+x.code).join("\n")+"\n");
 }finally{await output.close();}
 await db.runTransaction(async tx=>{
  const snapshots=await Promise.all(refs.map(r=>tx.get(r)));
  if(snapshots.some(s=>s.exists))throw Error("Rehearsal groups created concurrently; no overwrite");
  for(let i=0;i<groups.length;i++)
   tx.create(refs[i],{
    activityId:activity,displayName:"測試第"+(i+1)+"組",phase2:true,
    maxMembers:7,memberCount:0,
    joinTokenHash:createHash("sha256").update(keys[i].code).digest("hex"),
    createdAt:FieldValue.serverTimestamp()
   });
 });
 console.log("CREATED rehearsal-only groups; official taipei2026 untouched. Private credentials stored locally.");
}
