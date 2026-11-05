// Adapts the unchanged five original task forms into the verified submission contract.
// Does NOT perform network operations, nor decide whether a mission is completed.
export const FORM_SPEC = Object.freeze({
  1:{photoKeys:["photo1"],answerKeys:["location"]},
  2:{photoKeys:["lang1_photo","lang2_photo","lang3_photo","lang4_photo"],answerKeys:["lang1_lang","lang2_lang","lang3_lang","lang4_lang"]},
  3:{photoKeys:["photo1","photo2"],answerKeys:[]},
  4:{photoKeys:["c1_photo","c2_photo","c3_photo"],answerKeys:["c1_continent","c1_country","c2_continent","c2_country","c3_continent","c3_country"]},
  5:{photoKeys:["p1_photo","p2_photo","p3_photo"],answerKeys:["p1_country","p1_name","p2_country","p2_name","p3_country","p3_name"]}
});
export function extractMissionForm(missionId,formData) {
  const spec=FORM_SPEC[Number(missionId)];
  if(!spec)throw Error("未知關卡");
  if(!formData || typeof formData!=="object" || Array.isArray(formData))throw Error("沒有任務資料");
  if(formData.safetyCheck!==true)throw Error("請先確認拍照安全事項");
  const answers={},localPhotos={};
  for(const key of spec.answerKeys){
    const v=formData[key];
    if(typeof v!=="string" || !v.trim() || v.length>300)throw Error(`文字欄位 ${key} 尚未完成`);
    answers[key]=v.trim();
  }
  for(const key of spec.photoKeys){
    const value=formData[key];
    // Original UI stores local JPEG data URLs. No URL should be trusted as
    // evidence of a cloud upload: upload each photo before calling the backend.
    if(typeof value!=="string" || !/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(value))
      throw Error(`照片欄位 ${key} 缺少本機 JPEG 資料`);
    localPhotos[key]=value;
  }
  return {answers,localPhotos};
}
export function mapUploadedPaths(missionId,uploads) {
  const spec=FORM_SPEC[Number(missionId)];
  if(!spec || !uploads || typeof uploads!=="object")throw Error("照片上傳資料不完整");
  if(Object.keys(uploads).length!==spec.photoKeys.length)throw Error("照片數量不正確");
  const paths={};
  for(const key of spec.photoKeys){
    const path=uploads[key];
    if(typeof path!=="string"||!path.startsWith("activities/")||!path.endsWith("/"+key+".jpg"))
      throw Error(`照片 ${key} 尚未取得雲端儲存路徑`);
    paths[key]=path;
  }
  return paths; // Server must still verify each object exists and is authorized.
}
