// Create ONE new QR pilot student invitation for existing group01 (TEST02).
// Safe default: dry run; apply requires explicit teacher acknowledgement.
// No group, member, mission, teacher, Storage or Functions changes.
import {randomBytes} from "node:crypto";
export const PROJECT="taipei-cultural-adventure";
export const ACTIVITY="pilot2026";
export const GROUP="group01";
export const CODE="TEST02";
export const GROUP_PATH=`activities/${ACTIVITY}/groups/${GROUP}`;
const REQUIRED=["--apply",`--project=${PROJECT}`,"--confirm=ISSUE_PILOT2026_GROUP01_TEST02_INVITE"];
export function plan(){
 return {mode:"DRY_RUN_NO_WRITES",project:PROJECT,
  activityId:ACTIVITY,groupId:GROUP,studentCode:CODE,
  groupPath:GROUP_PATH,invitePath:"invites/<private random 48-hex>",
  writes:"ONE NEW INVITATION ONLY",preserve:"TEST01, missions/1, demo2026 and teacherAccess"};
}
export function requireOptIn(args,env=process.env){
 if(args.length!==REQUIRED.length || args.some((x,i)=>x!==REQUIRED[i]))
  throw Error("Safety gate: expected exact --apply, project, and TEST02 confirmation");
 if(env.GCLOUD_PROJECT!==PROJECT || env.ALLOW_PILOT2026_TEST02!=="YES")
  throw Error("Safety gate: project match and explicit TEST02 acknowledgement required");
 if(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error("Safety gate: refuses mixed emulator/production environment");
 return true;
}
export async function createTest02Invite({db,token,serverTimestamp}){
 if(!/^[a-f0-9]{48}$/.test(token))throw Error("Invalid random 48-hex token");
 const groupRef=db.doc(GROUP_PATH);
 const inviteRef=db.doc("invites/"+token);
 // Check existing members and issued invitations first: prevent repeated
 // issuance including after a connection error or partially completed attempt.
 const [members,previousInvites]=await Promise.all([
  db.collection(GROUP_PATH+"/members").where("studentCode","==",CODE).get(),
  db.collection("invites").where("studentCode","==",CODE).get()
 ]);
 if(!members.empty)throw Error("TEST02 already enrolled. Refusing duplicate invitation");
 const existing=previousInvites.docs.filter(d=>{
  const v=d.data();
  return v.activityId===ACTIVITY && v.groupId===GROUP;
 });
 if(existing.length)throw Error("TEST02 invite already issued; refuse duplicate and inspect existing invite privately");
 await db.runTransaction(async tx=>{
  const [group,collision]=await Promise.all([tx.get(groupRef),tx.get(inviteRef)]);
  if(!group.exists || group.data()?.pilot!==true)
   throw Error("Expected existing pilot2026 group01 missing; refusing writes");
  if(collision.exists)throw Error("Private token collision; refusing overwrite");
  tx.create(inviteRef,{
   activityId:ACTIVITY,groupId:GROUP,studentCode:CODE,claimedBy:null,
   createdAt:serverTimestamp(),purpose:"qr-pilot-test"
  });
 });
 return {activityId:ACTIVITY,groupId:GROUP,studentCode:CODE};
}
async function main(){
 const args=process.argv.slice(2);
 if(!args.length || (args.length===1&&args[0]==="--dry-run")){
  console.log(JSON.stringify(plan(),null,2));
  return;
 }
 requireOptIn(args);
 const {initializeApp,applicationDefault}=await import("firebase-admin/app");
 const {getFirestore,FieldValue}=await import("firebase-admin/firestore");
 initializeApp({projectId:PROJECT,credential:applicationDefault()});
 const token=randomBytes(24).toString("hex");
 const result=await createTest02Invite({
  db:getFirestore(),token,serverTimestamp:()=>FieldValue.serverTimestamp()
 });
 console.log("CREATED one unused invitation for "+result.activityId+"/"+result.groupId+"/"+result.studentCode);
 console.log("Unchanged: existing group, TEST01, first mission, demo2026, teacherAccess.");
 console.log("PRIVATE TEST02 TOKEN (never paste into chat/screenshots): "+token);
}
if(process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href)
 await main();
