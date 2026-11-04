// Development-only bridge. A mission becomes complete only from a trusted
// Firestore snapshot, not when local upload or the callable returns.
import {uploadMissionWithRecovery} from "./mission-upload-recovery.js";
import {uploadGroupPhoto} from "./photo-upload.js";
import {submitGroupMission} from "./mission-submission.js";

export async function submitOriginalMission({missionId,formData,onProgress=()=>{},submitMission=submitGroupMission}){
 return uploadMissionWithRecovery({
   missionId,formData,onProgress,
   loadPhoto:async dataUrl=>{
     const response=await fetch(dataUrl);
     if(!response.ok)throw new Error("無法讀取本機照片");
     return response.blob();
   },
   uploadPhoto:uploadGroupPhoto,
   submitMission
 });
}
