// Official activity only: safely change three existing seven-seat groups to ten.
// Never creates groups, touches QR secrets, or modifies rehearsal activities.
// Dry-run by default; explicit --apply is needed. Idempotent at 10 seats.
import {createRequire} from "node:module";
import {resolve} from "node:path";
const args=process.argv.slice(2);
const apply=args.length===1&&args[0]==="--apply";
if(args.length && !apply)throw Error("Use no arguments to inspect, or --apply");
const project="taipei-cultural-adventure",activity="taipei2026";
const names=["group01","group02","group03"];
if(["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"].some(k=>process.env[k]))
 throw Error("Unexpected emulator environment");
if(apply&&(process.env.GCLOUD_PROJECT!==project||process.env.ALLOW_PHASE2_CAPACITY_CHANGE!=="YES"))
 throw Error("Changing capacity requires GCLOUD_PROJECT=taipei-cultural-adventure and ALLOW_PHASE2_CAPACITY_CHANGE=YES");
const requireAdmin=createRequire(resolve("functions/package.json"));
const {initializeApp,applicationDefault}=requireAdmin("firebase-admin/app");
const {getFirestore}=requireAdmin("firebase-admin/firestore");
const credential=applicationDefault();await credential.getAccessToken();
initializeApp({projectId:project,credential});const db=getFirestore();
const refs=names.map(x=>db.doc(`activities/${activity}/groups/${x}`));
const inspect=s=>{
 const d=s.data()||{};
 return {exists:s.exists,phase2:d.phase2===true,capacity:d.maxMembers,
  memberCount:d.memberCount,validQrHash:/^[a-f0-9]{64}$/.test(d.joinTokenHash||"")};
};
const snaps=await db.getAll(...refs);
for(let i=0;i<names.length;i++)console.log(JSON.stringify({group:names[i],...inspect(snaps[i])}));
const permitted=snaps.every(s=>{
 const d=s.data()||{};
 return s.exists&&d.phase2===true&&[7,10].includes(d.maxMembers)&&
 d.memberCount===0&&/^[a-f0-9]{64}$/.test(d.joinTokenHash||"");
});
if(!permitted)throw Error("Official groups not in expected prelaunch state. NO CHANGES.");
if(!apply){console.log("DRY RUN PASS. No Firestore changes. Run --apply with explicit environment variables.");process.exit(0);}
await db.runTransaction(async tx=>{
 const current=await Promise.all(refs.map(ref=>tx.get(ref)));
 if(!current.every(s=>{
  const d=s.data()||{};
  return s.exists&&d.phase2===true&&[7,10].includes(d.maxMembers)&&
   d.memberCount===0&&/^[a-f0-9]{64}$/.test(d.joinTokenHash||"");
 }))throw Error("Concurrent group change detected. No changes made.");
 current.forEach((s,i)=>{if(s.data().maxMembers!==10)tx.update(refs[i],{maxMembers:10});});
});
const verified=await db.getAll(...refs);
if(verified.some(s=>s.data()?.maxMembers!==10||s.data()?.memberCount!==0))
 throw Error("POST-UPDATE VERIFICATION FAILED. Inspect official group documents.");
console.log("PASS: 3 formal groups now reserve 10 seats each (30 total), QR hashes unchanged.");
