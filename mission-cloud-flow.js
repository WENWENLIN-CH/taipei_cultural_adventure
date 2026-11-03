// Development-only bridge between the original quest form and the verified
// Firebase submission flow. Do not mark a mission done until the shared
// Firestore snapshot reports status "completed".
import {extractMissionForm,mapUploadedPaths} from "./mission-form-adapter.js";
import {uploadGroupPhoto} from "./photo-upload.js";
import {submitGroupMission} from "./mission-submission.js";

export async function submitOriginalMission({missionId,formData,onProgress=()=>{}}){
 const {answers,localPhotos}=extractMissionForm(missionId,formData);
 const uploaded={};
 // Strictly sequential; if one photo fails, no completed record is created.
 // Already-uploaded immutable objects remain in Storage and must be handled by
 // a trusted retake / recovery mechanism before rolling this into a live UI.
 const photoEntries=Object.entries(localPhotos);
 for(const [index,[photoKey,dataUrl]] of photoEntries.entries()){
   onProgress(`上傳第 ${index+1}／${photoEntries.length} 張照片中…`);
   const response=await fetch(dataUrl);
   const blob=await response.blob();
   if(blob.type!=="image/jpeg")throw Error("只能提交 JPEG 照片");
   const {path}=await uploadGroupPhoto({missionId,photoKey,blob});
   uploaded[photoKey]=path;
 }
 onProgress("照片已上傳，正在向伺服器確認共同成果…");
 const photoPaths=mapUploadedPaths(missionId,uploaded);
 const response=await submitGroupMission({missionId,answers,photoPaths});
 onProgress("共同成果已提交，等待小組同步確認。");
 return response;
}
