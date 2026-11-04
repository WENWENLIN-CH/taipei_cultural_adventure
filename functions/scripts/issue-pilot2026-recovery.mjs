// Teacher-operated recovery-code issuance for an existing pilot test member.
// Default DRY RUN: absolutely no remote reads, writes, or authentication.
// This reuses the current Firestore one-time invitation rules, so no rule
// changes, new callable, or student-side code are required.
// Never paste the printed private 48-character token into chat or GitHub.
import {randomBytes} from "node:crypto";

export const PROJECT="taipei-cultural-adventure";
export const ACTIVITY="pilot2026";
export const GROUP="group01";
export const STUDENT_CODE="TEST01";
export const GROUP_PATH=`activities/${ACTIVITY}/groups/${GROUP}`;
const CONFIRM="ISSUE_PILOT2026_GROUP01_TEST01_RECOVERY";
const REQUIRED_ARGS=["--apply",`--project=${PROJECT}`,`--confirm=${CONFIRM}`];

export function plan(){
 return {
  mode:"DRY_RUN_NO_WRITES",
  project:PROJECT,activityId:ACTIVITY,groupId:GROUP,studentCode:STUDENT_CODE,
  originalGroup:GROUP_PATH,
  recoveryInvite:"invites/<fresh 48-hex token>",
  previousMemberStatus:"UNCHANGED",
  missionDocumentsWritten:0,
  teacherAccessWritten:0,
  note:"A new anonymous UID may join the existing group; original group progress remains untouched."
 };
}
export function verifyApproval(args,env=process.env){
 if(args.length!==REQUIRED_ARGS.length || args.some((v,i)=>v!==REQUIRED_ARGS[i]))
  throw Error("Recovery safety gate: exact --apply, --project and --confirm required");
 if(env.ALLOW_PILOT2026_RECOVERY!=="YES" || env.GCLOUD_PROJECT!==PROJECT)
  throw Error("Recovery safety gate: explicit environment acknowledgement and project match required");
 if(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error("Recovery safety gate: mixed emulator/production environment not allowed");
 return true;
}
export async function issueRecovery({db,token,serverTimestamp}){
 if(!/^[a-f0-9]{48}$/.test(token))throw Error("Invalid secure recovery token");
 const groupRef=db.doc(GROUP_PATH);
 const memberCollection=db.collection(GROUP_PATH+"/members");
 const members=await memberCollection.where("studentCode","==",STUDENT_CODE).get();
 if(members.empty)throw Error("Recovery refused: existing member TEST01 was not found");
 const originals=members.docs.filter(item=>item.data()?.revoked!==true);
 if(!originals.length)throw Error("Recovery refused: no active original member");
 // Confirm group still exists; do not issue a code for a deleted/replaced group.
 const group=await groupRef.get();
 if(!group.exists || group.data()?.pilot!==true)
  throw Error("Recovery refused: expected pilot group does not exist");
 const inviteRef=db.doc("invites/"+token);
 await db.runTransaction(async tx=>{
  const existing=await tx.get(inviteRef);
  if(existing.exists)throw Error("Recovery token collision; refuse overwrite");
  tx.create(inviteRef,{
   activityId:ACTIVITY,groupId:GROUP,studentCode:STUDENT_CODE,
   claimedBy:null,
   createdAt:serverTimestamp(),
   purpose:"device-recovery"
  });
 });
 return {activityId:ACTIVITY,groupId:GROUP,studentCode:STUDENT_CODE};
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length===0 || (args.length===1 && args[0]==="--dry-run")){
  process.stdout.write(JSON.stringify(plan(),null,2)+"\n");
  return;
 }
 verifyApproval(args);
 const {initializeApp,applicationDefault}=await import("firebase-admin/app");
 const {getFirestore,FieldValue}=await import("firebase-admin/firestore");
 initializeApp({projectId:PROJECT,credential:applicationDefault()});
 const db=getFirestore();
 const token=randomBytes(24).toString("hex");
 const result=await issueRecovery({
  db,token,serverTimestamp:()=>FieldValue.serverTimestamp()
 });
 process.stdout.write("ISSUED a fresh one-time device recovery invite for "+result.activityId+"/"+result.groupId+"/"+result.studentCode+".\n");
 process.stdout.write("Existing members, five missions, and demo2026 were NOT changed.\n");
 process.stdout.write("PRIVATE RECOVERY INVITE (do not screenshot or share in chat): "+token+"\n");
}
if(process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href)
 await main();
