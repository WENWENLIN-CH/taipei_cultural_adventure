// DEVELOPMENT ONLY: callable backend is NOT deployed.
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {createSubmissionHandler} from "./submission-handler.js";
initializeApp();
const handler=createSubmissionHandler({
  db:getFirestore(),
  bucket:getStorage().bucket("taipei-cultural-adventure.firebasestorage.app"),
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
