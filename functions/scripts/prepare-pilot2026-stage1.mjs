// Prepare one private pilot group without modifying any Firebase data by default.
// Only an explicit, reviewed invocation can create online Firestore documents.
// Usage (no writes): node functions/scripts/prepare-pilot2026-stage1.mjs
// This is intentionally not called by npm build or CI.
import {randomBytes} from "node:crypto";

export const PILOT_PROJECT="taipei-cultural-adventure";
export const PILOT_ACTIVITY="pilot2026";
export const PILOT_GROUP="group01";
export const PILOT_STUDENT_CODE="TEST01";
export const PILOT_BASE=`activities/${PILOT_ACTIVITY}/groups/${PILOT_GROUP}`;

export function makePlan(){
 return {
  project:PILOT_PROJECT,
  activity:PILOT_ACTIVITY,
  group:PILOT_GROUP,
  groupDocument:PILOT_BASE,
  inviteDocument:"invites/<new random private 48-hex token>",
  studentCode:PILOT_STUDENT_CODE,
  missionDocumentsCreated:0,
  expectedFirstMission:1,
  note:"Does not alter demo2026, teacherAccess, or existing missions"
 };
}
export function verifyLiveOptIn(args,env=process.env){
 const expected=["--apply","--project=taipei-cultural-adventure","--confirm=CREATE_PILOT2026_GROUP01"];
 if(args.length!==expected.length || expected.some((value,i)=>args[i]!==value))
  throw Error("Safety gate: exact --apply --project=... --confirm=... arguments required");
 if(env.ALLOW_PILOT2026_SEED!=="YES" || env.GCLOUD_PROJECT!==PILOT_PROJECT)
  throw Error("Safety gate: explicit env acknowledgement and matching GCLOUD_PROJECT required");
 if(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error("Safety gate: emulators detected; script does not support mixed destinations");
 return true;
}
export async function applyPlan({db,plan,token,serverTimestamp}){
 if(plan.project!==PILOT_PROJECT || plan.group!==PILOT_GROUP || !/^[a-f0-9]{48}$/.test(token))
  throw Error("Unsafe pilot creation arguments");
 const groupRef=db.doc(PILOT_BASE);
 const inviteRef=db.doc("invites/"+token);
 await db.runTransaction(async tx=>{
  const [existingGroup,existingInvite]=await Promise.all([tx.get(groupRef),tx.get(inviteRef)]);
  if(existingGroup.exists)throw Error("Pilot group already exists; refusing to overwrite");
  if(existingInvite.exists)throw Error("Invitation collision; refusing to overwrite");
  tx.create(groupRef,{displayName:"試辦第一組",createdAt:serverTimestamp(),pilot:true});
  tx.create(inviteRef,{
   activityId:PILOT_ACTIVITY,
   groupId:PILOT_GROUP,
   studentCode:PILOT_STUDENT_CODE,
   claimedBy:null,
   createdAt:serverTimestamp()
  });
 });
}
async function main(){
 const args=process.argv.slice(2);
 const plan=makePlan();
 if(args.length===0 || (args.length===1 && args[0]==="--dry-run")){
  process.stdout.write(JSON.stringify({mode:"DRY_RUN_NO_WRITES",...plan},null,2)+"\n");
  return;
 }
 verifyLiveOptIn(args);
 // No privileged SDK loaded in dry-run mode.
 const {initializeApp,applicationDefault}=await import("firebase-admin/app");
 const {getFirestore,FieldValue}=await import("firebase-admin/firestore");
 initializeApp({projectId:PILOT_PROJECT,credential:applicationDefault()});
 const db=getFirestore();
 const token=randomBytes(24).toString("hex");
 await applyPlan({db,plan,token,serverTimestamp:()=>FieldValue.serverTimestamp()});
 // Printed only to the operator's private terminal; NEVER commit to GitHub.
 process.stdout.write("CREATED pilot2026/group01 and ONE private invite. Save the invitation securely.\n");
 process.stdout.write("Private single-use token: "+token+"\n");
}
if(process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href){
 await main();
}
