// Three reusable per-group QR codes, seven anonymous members per group.
// Default dry-run has NO Firebase access or secrets. --apply requires explicit review.
import {randomBytes,createHash} from "node:crypto";
import {open} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
export const PROJECT="taipei-cultural-adventure";
export const ACTIVITY="taipei2026";
export const GROUP_IDS=Object.freeze(["group01","group02","group03"]);
export const STUDENTS_PER_GROUP=7;
export const OUTPUT=".phase2-private-invites.txt";
export function makePlan(){
 return {mode:"DRY_RUN_NO_WRITES",projectId:PROJECT,activityId:ACTIVITY,
  groups:GROUP_IDS.map((groupId,i)=>({
   groupId,displayName:`第${i+1}組`,capacity:STUDENTS_PER_GROUP,
   groupPath:`activities/${ACTIVITY}/groups/${groupId}`,qrCodes:1,
   reusable:true
  })),
  totalStudents:21,qrCodesToGenerate:3,oneTimeInvitesToGenerate:0,
  createsMissions:0,changesPilot2026:false,deploys:false};
}
export function makeGroupKeys(random=()=>randomBytes(24).toString("hex")){
 const keys=GROUP_IDS.map(groupId=>({groupId,code:random()}));
 if(new Set(keys.map(x=>x.code)).size!==3||keys.some(x=>!/^[a-f0-9]{48}$/.test(x.code)))
  throw Error("QR credential generation failed");
 return keys;
}
export const hashCode=code=>createHash("sha256").update(code).digest("hex");
export function verifyApply(args,env=process.env){
 if(args.length!==3||args[0]!=="--apply"||args[1]!==`--project=${PROJECT}`||
  args[2]!==`--confirm=CREATE_${ACTIVITY.toUpperCase()}_THREE_GROUPS`)
  throw Error("Live creation requires exact explicit confirmation");
 if(env.ALLOW_PHASE2_CREATE!=="YES"||env.GCLOUD_PROJECT!==PROJECT)
  throw Error("Explicit project and ALLOW_PHASE2_CREATE=YES required");
 for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"])
  if(env[key])throw Error("Cannot provision production with emulator variables");
 return true;
}
export async function applyPlan({db,plan,keys,serverTimestamp}){
 if(plan.activityId!==ACTIVITY||keys.length!==3||
  keys.some((x,i)=>x.groupId!==GROUP_IDS[i]||!/^[a-f0-9]{48}$/.test(x.code)))
  throw Error("Invalid creation plan");
 await db.runTransaction(async tx=>{
  const refs=plan.groups.map(g=>db.doc(g.groupPath));
  const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
  if(snaps.some(s=>s.exists))throw Error("Existing group detected, refusing overwrite");
  for(let i=0;i<3;i++)
   tx.create(refs[i],{
    displayName:plan.groups[i].displayName,activityId:ACTIVITY,phase2:true,
    maxMembers:7,memberCount:0,joinTokenHash:hashCode(keys[i].code),
    createdAt:serverTimestamp()
   });
 });
}
async function main(){
 const args=process.argv.slice(2);
 const plan=makePlan();
 console.log(JSON.stringify(plan,null,2));
 if(args.length===0||(args.length===1&&args[0]==="--dry-run"))return;
 verifyApply(args);
 // Resolve Firebase Admin from functions/node_modules BEFORE writing credentials.
 // The repository root package.json does not depend on firebase-admin.
 const requireAdmin=createRequire(resolve("functions/package.json"));
 const {initializeApp,applicationDefault}=requireAdmin("firebase-admin/app");
 const {getFirestore,FieldValue}=requireAdmin("firebase-admin/firestore");
 const keys=makeGroupKeys();
 const output=await open(resolve(OUTPUT),"wx",0o600);
 try{
  await output.writeFile([
   "PRIVATE REUSABLE QR CREDENTIALS — NEVER SHARE IN CHAT OR GITHUB",
   ...keys.map(x=>`${x.groupId}\t${x.code}`)
  ].join("\n")+"\n");
 }finally{await output.close();}
 initializeApp({projectId:PROJECT,credential:applicationDefault()});
 try{
  await applyPlan({db:getFirestore(),plan,keys,serverTimestamp:()=>FieldValue.serverTimestamp()});
 }catch(e){console.error("Not confirmed. Inspect Firestore before retry. Private keys preserved.");throw e;}
 console.log("CREATED 3 groups, 7-member limit each. Private reusable QR codes stored locally, NOT printed.");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
