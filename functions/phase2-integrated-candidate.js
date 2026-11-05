// Phase2 integrated submission candidate, exclusively for local Emulator tests.
// No onCall export, no production deployment, no new Storage or Firestore rules.
// Separate wrapper makes the server precondition run before the verified-photo handler.
import {requirePhase2Prerequisites} from "./phase2-prerequisite.js";
import {createSubmissionHandler} from "./submission-handler.js";
import {PHASE2_SERVER_CANDIDATE} from "./phase2-authorization.js";
export function createPhase2EmulatorCandidate({db,bucket,serverTimestamp,makeError}){
 if(!process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.GCLOUD_PROJECT!=="demo-taipei-isolated-pilot")
  throw Error("Phase2 candidate must run only with isolated Firebase emulators");
 const submit=createSubmissionHandler({
  db,bucket,serverTimestamp,makeError,emulatorPilotScope:PHASE2_SERVER_CANDIDATE,
  // Firestore transaction reads the previous mission before creating this one.
  // Retries will re-check this precondition after any concurrent change.
  transactionGuard:async({tx,db,input,base,makeError})=>{
   if(input.missionId<=1)return;
   const previous=await tx.get(db.doc(`${base}/missions/${input.missionId-1}`));
   if(!previous.exists||previous.data()?.status!=="completed")
    throw makeError("failed-precondition","請先完成上一關");
  }
 });
 return async function submitPhase2Candidate({uid,anonymous,data}){
  await requirePhase2Prerequisites({db,data,uid,anonymous,makeError});
  return submit({uid,anonymous,data});
 };
}
