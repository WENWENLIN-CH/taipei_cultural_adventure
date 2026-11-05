// Dedicated local-only Functions emulator entry, not for production deployment.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp,getApps} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createPhase2JoinHandler} from "./phase2-join-handler.js";
import {createPhase2EmulatorCandidate} from "./phase2-integrated-candidate.js";
if(process.env.GCLOUD_PROJECT!=="demo-taipei-isolated-pilot" ||
 !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
 !process.env.FIREBASE_AUTH_EMULATOR_HOST)
 throw Error("This entry only runs in local Firebase emulators");
if(!getApps().length) initializeApp({projectId:"demo-taipei-isolated-pilot",storageBucket:"demo-taipei-isolated-pilot.firebasestorage.app"});
const db=getFirestore();
const options={db,serverTimestamp:()=>FieldValue.serverTimestamp(),makeError:(code,message)=>new HttpsError(code,message)};
const join=createPhase2JoinHandler({...options,activityId:"phase2sandbox",groupIds:["group01","group02","group03"]});
const submit=createPhase2EmulatorCandidate({...options,bucket:getStorage().bucket()});
const actor=request=>({uid:request.auth?.uid,anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",data:request.data});
export const joinPhase2Group=onCall({region:"asia-east1"},request=>join(actor(request)));
export const submitPhase2Mission=onCall({region:"asia-east1"},request=>submit(actor(request)));
