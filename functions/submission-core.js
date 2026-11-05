// Pure validation of a *complete* group submission. No Firebase credentials here.
export const PHOTO_KEYS = Object.freeze({
  1:["photo1"],
  2:["lang1_photo","lang2_photo","lang3_photo","lang4_photo"],
  3:["photo1","photo2"],
  4:["c1_photo","c2_photo","c3_photo"],
  5:["p1_photo","p2_photo","p3_photo"]
});
const validId = value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,60}$/.test(value);
const filled = value => typeof value === "string" && value.trim().length > 0;
const unique = arr => new Set(arr.map(v=>v.trim().toLocaleLowerCase())).size === arr.length;
export function validateGroupPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("缺少提交資料");
  const {activityId,groupId,missionId,answers,photoPaths} = data;
  if(!validId(activityId)||!validId(groupId)) throw Error("無效的小組資訊");
  if(!Number.isInteger(missionId) || missionId<1 || missionId>5) throw Error("無效的關卡");
  if(!answers || typeof answers!=="object" || Array.isArray(answers) ||
     !photoPaths || typeof photoPaths!=="object" || Array.isArray(photoPaths)) throw Error("答案或照片資料格式錯誤");
  if(Object.keys(answers).length>50 || Object.values(answers).some(v=>typeof v!=="string" || v.length>300)) throw Error("答案格式或長度不正確");
  const expected=PHOTO_KEYS[missionId];
  if(Object.keys(photoPaths).length!==expected.length ||
    Object.keys(photoPaths).some(k=>!expected.includes(k))) throw Error("照片數量或欄位不正確");
  for(const key of expected) if(!filled(photoPaths[key])) throw Error("缺少必要照片");
  if(missionId===1 && !filled(answers.location)) throw Error("請填寫發現地點");
  if(missionId===2) {
    const langs=[1,2,3,4].map(i=>answers[`lang${i}_lang`]);
    if(!langs.every(filled) || !unique(langs)) throw Error("請填寫四種不同語言");
  }
  // Restaurant names are optional in Phase2; legacy activity contracts remain unchanged.
  if(missionId===3 && !["taipei2026","taipei2026rehearsal"].includes(activityId) && !filled(answers.restaurant)) throw Error("請填寫餐廳名稱");
  if(missionId===4) {
    const continents=[1,2,3].map(i=>answers[`c${i}_continent`]);
    if(!continents.every(v=>["亞洲","歐洲","非洲","美洲","大洋洲"].includes(v)) || !unique(continents)) throw Error("請選三個不同洲");
    for(let i=1;i<=3;i++)if(!filled(answers[`c${i}_country`]) || (!["taipei2026","taipei2026rehearsal"].includes(activityId) && !filled(answers[`c${i}_restaurant`])))throw Error("請填完整國家資料");
  }
  if(missionId===5) {
    const countries=[1,2,3].map(i=>answers[`p${i}_country`]);
    if(!countries.every(filled)||!unique(countries)) throw Error("請填寫三個不同國家");
    for(let i=1;i<=3;i++)if(!filled(answers[`p${i}_name`]))throw Error("請填商品名稱");
  }
  return {activityId,groupId,missionId,answers,photoPaths};
}
export function parseVerifiedPhotoPath(path, {activityId,groupId,missionId,photoKey}) {
  if(typeof path!=="string" || path.length>300) throw Error("照片路徑格式錯誤");
  const m=/^activities\/([A-Za-z0-9_-]{1,60})\/groups\/([A-Za-z0-9_-]{1,60})\/missions\/([1-5])\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_]+)\.jpg$/.exec(path);
  if(!m || m[1]!==activityId || m[2]!==groupId || Number(m[3])!==missionId || m[5]!==photoKey) throw Error("照片不屬於這組或這一關");
  return {uploaderUid:m[4],path};
}
