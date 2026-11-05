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
  db,bucket,serverTimestamp,makeError,emulatorPilotScope:PHASE2_SERVER_CANDIDATE
 });
 return async function submitPhase2Candidate({uid,anonymous,data}){
  await requirePhase2Prerequisites({db,data,uid,anonymous,makeError});
  return submit({uid,anonymous,data});
 };
}
