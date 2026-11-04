// Dependency-injected, emulator-friendly orchestration for retrying multi-photo submissions.
// Storage remains the source of truth: the actual upload function must verify
// exact SHA-256 bytes before reusing an immutable photo slot.
import {extractMissionForm,mapUploadedPaths} from "./mission-form-adapter.js";

export async function uploadMissionWithRecovery({
 missionId,formData,onProgress=()=>{},loadPhoto,uploadPhoto,submitMission
}){
 if(typeof loadPhoto!=="function" || typeof uploadPhoto!=="function" || typeof submitMission!=="function")
   throw new Error("缺少雲端提交流程");
 // Validate the complete form before uploading ANY bytes.
 const {answers,localPhotos}=extractMissionForm(missionId,formData);
 const uploaded={};
 const entries=Object.entries(localPhotos);
 for(const [index,[photoKey,dataUrl]] of entries.entries()){
   onProgress(`檢查第 ${index+1}／${entries.length} 張照片：${photoKey}`);
   let blob;
   try{
     blob=await loadPhoto(dataUrl);
     if(!(blob instanceof Blob)||blob.type!=="image/jpeg"||blob.size===0||blob.size>1024*1024)
       throw new Error("照片必須是壓縮後且不超過 1 MiB 的 JPEG");
     // uploadPhoto MUST verify immutable object metadata and byte digest.
     // This is safe to retry with the exact same source photo after a failed call.
     const result=await uploadPhoto({missionId,photoKey,blob,onProgress});
     if(!result || typeof result.path!=="string")throw new Error("未取得雲端照片路徑");
     uploaded[photoKey]=result.path;
     onProgress(`第 ${index+1}／${entries.length} 張已確認${result.reused?"（沿用相同照片）":""}`);
   }catch(error){
     const detail=error instanceof Error?error.message:"未知錯誤";
     throw new Error(`第 ${index+1} 張照片（${photoKey}）未能確認：${detail}。請保留原始照片與目前登入裝置，恢復網路後以相同照片重試；不同照片無法覆蓋既有欄位。`,{cause:error});
   }
 }
 // There is no persisted completion or client-side unlock before this server call.
 const photoPaths=mapUploadedPaths(missionId,uploaded);
 onProgress("所有照片已確認，正在驗證小組共同成果…");
 const result=await submitMission({missionId,answers,photoPaths});
 onProgress("伺服器已回覆，等待 Firestore 小組進度同步確認。");
 return result;
}
