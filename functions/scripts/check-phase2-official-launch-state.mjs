// READ-ONLY launch gate for official activity taipei2026. Never prints QR secrets.
// Does not initialize or modify group data. Must run only with authorized ADC.
import {createRequire} from "node:module";
import {resolve} from "node:path";
const requireAdmin=createRequire(resolve("functions/package.json"));
const {initializeApp,applicationDefault}=requireAdmin("firebase-admin/app");
const {getFirestore}=requireAdmin("firebase-admin/firestore");
const project="taipei-cultural-adventure";
for(const env of ["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"]){
 if(process.env[env])throw Error("Emulator environment detected; no live launch check");
}
const credential=applicationDefault();
await credential.getAccessToken();
initializeApp({credential,projectId:project});
const db=getFirestore(),base="activities/taipei2026/groups/";
const groups=["group01","group02","group03"];
const records=await db.getAll(...groups.map(g=>db.doc(base+g)));
let valid=true;
for(let i=0;i<groups.length;i++){
 const g=groups[i],s=records[i],d=s.data()||{};
 const members=await db.collection(base+g+"/members").limit(1).get();
 const missions=await db.collection(base+g+"/missions").limit(1).get();
 const correct=s.exists&&d.phase2===true&&d.maxMembers===10&&d.memberCount===0&&
  /^[a-f0-9]{64}$/.test(d.joinTokenHash||"")&&members.empty&&missions.empty;
 valid=valid&&correct;
 console.log(JSON.stringify({
 group:g,exists:s.exists,capacity:d.maxMembers??null,
 memberCount:d.memberCount??null,hasPrivateQrHash:/^[a-f0-9]{64}$/.test(d.joinTokenHash||""),
 membersEmpty:members.empty,missionsEmpty:missions.empty,
 preLaunchReady:!!correct
 }));
}
if(!valid)throw Error("OFFICIAL GROUP STATE IS NOT PRISTINE. DO NOT RELEASE QR CODES.");
console.log("PASS: official taipei2026 has three pristine, reserved ten-seat groups. READ-ONLY.");
