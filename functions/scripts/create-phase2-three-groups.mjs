// Prepare a private three-group event and individual single-use student invites.
// Default: DRY RUN, absolutely no Firebase connections or writes.
// Real --apply is intentionally gated; use only AFTER Security Rules review.
import {randomBytes} from "node:crypto";
import {open,rm} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

export const PROJECT="taipei-cultural-adventure";
export const ACTIVITY="taipei2026"; // Provisional event ID; confirm before any live apply.
export const GROUP_IDS=Object.freeze(["group01","group02","group03"]);
export const OUTPUT=".phase2-private-invites.txt";
export function countsFromArgs(args){
 const m={};
 for(const arg of args){
  const match=/^--(group0[1-3])=(\d+)$/.exec(arg);
  if(!match||m[match[1]]!==undefined)throw Error("Use exactly --group01=N --group02=N --group03=N");
  m[match[1]]=Number(match[2]);
 }
 if(Object.keys(m).length!==3||GROUP_IDS.some(g=>!Number.isSafeInteger(m[g])||m[g]<1||m[g]>30))
  throw Error("Provide 1–30 students per group; one private invite per student");
 if(Object.values(m).reduce((s,n)=>s+n,0)>90)throw Error("Maximum 90 invites per run");
 return m;
}
export function makePlan(counts){
 return {
  mode:"DRY_RUN_NO_WRITES",projectId:PROJECT,activityId:ACTIVITY,
  groups:GROUP_IDS.map((groupId,i)=>({
   groupId,displayName:`第${i+1}組`,students:counts[groupId],
   groupPath:`activities/${ACTIVITY}/groups/${groupId}`,
   studentCodes:Array.from({length:counts[groupId]},(_,j)=>`G${i+1}-S${String(j+1).padStart(2,"0")}`)
  })),
  groupDocumentsToCreate:3,privateInvitesToCreate:Object.values(counts).reduce((s,n)=>s+n,0),
  createsMissions:0,changesPilot2026:false,changesTeacherAccess:false,
  privateOutput:OUTPUT,deploys:false
 };
}
export function verifyApply(args,env=process.env){
 if(args.length!==3||
  args[0]!=="--apply"||args[1]!==`--project=${PROJECT}`||
  args[2]!==`--confirm=CREATE_${ACTIVITY.toUpperCase()}_THREE_GROUPS`)
  throw Error("Live creation needs exact --apply, project and activity confirmation");
 if(env.ALLOW_PHASE2_CREATE!=="YES"||env.GCLOUD_PROJECT!==PROJECT)
  throw Error("Explicit ALLOW_PHASE2_CREATE=YES and matching GCLOUD_PROJECT required");
 for(const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"])
  if(env[key])throw Error("Cannot provision live event with emulator env present");
 return true;
}
export function makeInvites(plan,random=()=>randomBytes(24).toString("hex")){
 const entries=plan.groups.flatMap(g=>g.studentCodes.map(studentCode=>({
  activityId:ACTIVITY,groupId:g.groupId,studentCode,token:random()
 })));
 if(new Set(entries.map(e=>e.token)).size!==entries.length||
  entries.some(e=>!/^[a-f0-9]{48}$/.test(e.token)))throw Error("Invitation token generation failure");
 return entries;
}
export async function applyPlan({db,plan,entries,serverTimestamp}){
 if(plan.activityId!==ACTIVITY||plan.groups.length!==3||
  entries.length!==plan.privateInvitesToCreate||
  entries.some(e=>e.activityId!==ACTIVITY||!GROUP_IDS.includes(e.groupId)||
   !/^[a-f0-9]{48}$/.test(e.token)))throw Error("Invalid creation plan");
 await db.runTransaction(async tx=>{
  const groupRefs=plan.groups.map(g=>db.doc(g.groupPath));
  const inviteRefs=entries.map(e=>db.doc("invites/"+e.token));
  // All reads first; any existing event or collision aborts the entire creation.
  const snapshots=await Promise.all([...groupRefs,...inviteRefs].map(ref=>tx.get(ref)));
  if(snapshots.some(s=>s.exists))throw Error("Existing activity group or invitation detected; no overwrite allowed");
  for(let i=0;i<plan.groups.length;i++){
   tx.create(groupRefs[i],{displayName:plan.groups[i].displayName,activityId:ACTIVITY,
    createdAt:serverTimestamp(),phase2:true});
  }
  for(let i=0;i<entries.length;i++){
   const e=entries[i];
   tx.create(inviteRefs[i],{
    activityId:ACTIVITY,groupId:e.groupId,studentCode:e.studentCode,
    claimedBy:null,createdAt:serverTimestamp(),purpose:"two-hour-field-activity"
   });
  }
 });
}
async function main(){
 const args=process.argv.slice(2);
 const applied=args[0]==="--apply";
 const countArgs=applied?args.slice(3):args[0]==="--dry-run"?args.slice(1):args;
 const counts=countsFromArgs(countArgs);
 const plan=makePlan(counts);
 console.log(JSON.stringify(plan,null,2));
 if(!applied)return;
 verifyApply(args.slice(0,3));
 const {initializeApp,applicationDefault}=await import("firebase-admin/app");
 const {getFirestore,FieldValue}=await import("firebase-admin/firestore");
 const entries=makeInvites(plan);
 // Reserve a private output file before any Firestore write so a crash cannot silently
 // strand issued tokens. The operator must inspect this file securely if a write fails.
 const output=resolve(OUTPUT);
 const handle=await open(output,"wx",0o600);
 try{
  await handle.writeFile([
   `PRIVATE INVITES for ${ACTIVITY}. DO NOT COMMIT OR SHARE.`,
   ...entries.map(e=>`${e.groupId}\t${e.studentCode}\t${e.token}`)
  ].join("\n")+"\n");
 }finally{await handle.close();}
 try{
  initializeApp({projectId:PROJECT,credential:applicationDefault()});
  await applyPlan({db:getFirestore(),plan,entries,
   serverTimestamp:()=>FieldValue.serverTimestamp()});
 }catch(error){
  console.error("Creation not confirmed; inspect Firestore before retrying. Private codes preserved at "+OUTPUT);
  throw error;
 }
 console.log(`CREATED 3 groups and ${entries.length} private one-time invites. Secrets stored locally at ${OUTPUT} only.`);
 console.log("Do not paste invitation tokens or this file into chat/GitHub.");
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 await main();
