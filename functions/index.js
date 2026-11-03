// DEVELOPMENT ONLY: callable backend is NOT deployed.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";
initializeApp();
const emulatedProject = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
const bucketName = process.env.FIREBASE_STORAGE_EMULATOR_HOST && emulatedProject.startsWith("demo-")
  ? `${emulatedProject}.firebasestorage.app`
  : "taipei-cultural-adventure.firebasestorage.app";
const handler=createSubmissionHandler({
  db:getFirestore(),
  bucket:getStorage().bucket(bucketName),
  serverTimestamp:()=>FieldValue.serverTimestamp(),
  makeError:(code,message)=>new HttpsError(code,message)
});
export const submitGroupMission=onCall({
  region:"asia-east1",maxInstances:2,memory:"256MiB",timeoutSeconds:60
},request=>handler({
  uid:request.auth?.uid,
  anonymous:request.auth?.token.firebase?.sign_in_provider==="anonymous",
  data:request.data
}));
