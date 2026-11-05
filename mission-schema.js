// Pure validation for the existing five quest missions.
// A photo is counted only if an uploader has returned a cloud object path.
// Client-side validation is convenience, NOT a security boundary.
export const REQUIRED_PHOTO_KEYS = Object.freeze({
  1:["photo1"],
  2:["lang1_photo","lang2_photo","lang3_photo","lang4_photo"],
  3:["photo1","photo2"],
  4:["c1_photo","c2_photo","c3_photo"],
  5:["p1_photo","p2_photo","p3_photo"]
});
const filled=x=>typeof x==="string" && x.trim().length>0;
const distinct=arr=>new Set(arr.map(x=>x.trim().toLocaleLowerCase())).size===arr.length;
const validPath=x=>filled(x)&&/^activities\/[A-Za-z0-9_-]+\/groups\/[A-Za-z0-9_-]+\/missions\/[1-5]\/[^/]+\/[^/]+\.jpe?g$/i.test(x);
export function validateSubmission(missionId, answers, photoPaths) {
  const n=Number(missionId);
  if(!Number.isInteger(n)||n<1||n>5) throw new Error("未知的關卡");
  if(!answers||typeof answers!=="object"||Array.isArray(answers)) throw new Error("缺少答案");
  if(!photoPaths||typeof photoPaths!=="object"||Array.isArray(photoPaths)) throw new Error("缺少雲端照片");
  const photoKeys=REQUIRED_PHOTO_KEYS[n];
  for(const k of photoKeys) if(!validPath(photoPaths[k])) throw new Error(`照片 ${k} 尚未完成雲端上傳`);
  if (Object.keys(photoPaths).some(k=>!photoKeys.includes(k))) throw new Error("包含不屬於該關的照片");
  if(!Object.values(answers).every(x=>typeof x==="string")) throw new Error("答案必須是文字");
  if(Object.values(answers).some(x=>x.length>300)) throw new Error("答案超出長度上限");
  if(n===1 && !filled(answers.location)) throw new Error("請填寫發現地點");
  if(n===2) {
    const langs=[1,2,3,4].map(i=>answers[`lang${i}_lang`]);
    if(!langs.every(filled)||!distinct(langs)) throw new Error("請填寫四種不同語言");
  }
  if(n===4) {
    const continents=[1,2,3].map(i=>answers[`c${i}_continent`]);
    if(!continents.every(x=>["亞洲","歐洲","非洲","美洲","大洋洲"].includes(x))||!distinct(continents)) throw new Error("請選擇三個不同洲");
    for(let i=1;i<=3;i++) if(!filled(answers[`c${i}_country`])) throw new Error("請完整填寫三個國家");
  }
  if(n===5) {
    const countries=[1,2,3].map(i=>answers[`p${i}_country`]);
    if(!countries.every(filled)||!distinct(countries)) throw new Error("請填寫三個不同國家");
    for(let i=1;i<=3;i++) if(!filled(answers[`p${i}_name`])) throw new Error("請完整填寫三種商品名稱");
  }
  return true;
}
