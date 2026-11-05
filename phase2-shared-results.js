// Read-only, same-group completed mission viewer. All bytes remain guarded
// by the deployed Firestore and Storage rules; no public download URLs.
import {getStorage,ref,getBlob} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";
import {auth} from "./firebase-auth.js";
const storage=auth?getStorage(auth.app):null;
const PHOTO_LABELS={
  1:{photo1:"星月標誌照片"},
  2:{lang1_photo:"語言 1 招牌",lang2_photo:"語言 2 招牌",lang3_photo:"語言 3 招牌",lang4_photo:"語言 4 招牌"},
  3:{photo1:"餐廳招牌",photo2:"清真認證／Halal 標示"},
  4:{c1_photo:"餐廳 1 招牌",c2_photo:"餐廳 2 招牌",c3_photo:"餐廳 3 招牌"},
  5:{p1_photo:"商品 1 照片",p2_photo:"商品 2 照片",p3_photo:"商品 3 照片"}
};
const ANSWER_LABELS={
 location:"發現地點",
 lang1_lang:"語言 1",lang2_lang:"語言 2",lang3_lang:"語言 3",lang4_lang:"語言 4",
 c1_continent:"餐廳 1 洲別",c1_country:"餐廳 1 國家",
 c2_continent:"餐廳 2 洲別",c2_country:"餐廳 2 國家",
 c3_continent:"餐廳 3 洲別",c3_country:"餐廳 3 國家",
 p1_country:"商品 1 來源國家",p1_name:"商品 1 名稱",
 p2_country:"商品 2 來源國家",p2_name:"商品 2 名稱",
 p3_country:"商品 3 來源國家",p3_name:"商品 3 名稱"
};
const make=(tag,value,cls)=>{
 const el=document.createElement(tag);
 if(value!==undefined)el.textContent=String(value);
 if(cls)el.className=cls;
 return el;
};
const valid=(g,id,key,path)=>typeof path==="string" && /^[A-Za-z0-9_]+$/.test(key) &&
 path.startsWith(`activities/${g.activityId}/groups/${g.groupId}/missions/${id}/`) &&
 /^activities\/[A-Za-z0-9_-]+\/groups\/[A-Za-z0-9_-]+\/missions\/[1-5]\/[A-Za-z0-9_-]+\/[A-Za-z0-9_]+\.jpg$/.test(path) &&
 path.endsWith("/"+key+".jpg");
export function createSharedResultViewer(){
 let generation=0;
 const activeUrls=new Set();
 function reset(){
  generation++;
  for(const url of activeUrls)URL.revokeObjectURL(url);
  activeUrls.clear();
 }
 function show({group,missionId,submission}){
  reset();
  if(!group||!submission||submission.status!=="completed")return false;
  const activeGeneration=generation;
  const screen=document.getElementById("missionScreen");
  const body=screen?.querySelector(".mission-detail-card .mission-body");
  const current=Number(screen?.querySelector(".mission-detail-card .eyebrow")?.textContent?.match(/\d+/)?.[0]);
  if(!body||current!==Number(missionId))return false;
  body.replaceChildren();
  const panel=make("section",undefined,"task-box");
  panel.append(make("h3","✅ 本組共同成果（唯讀）"));
  panel.append(make("p","已完成，這關不能重複提交或修改。所有組員都能查看這份成果。"));
  panel.append(make("p","提交組員："+(submission.submittedByCode||"未提供"),"small-note"));
  if(submission.submittedAt?.toDate)
   panel.append(make("p","提交時間："+submission.submittedAt.toDate().toLocaleString("zh-TW"),"small-note"));
  const answers=submission.answers&&typeof submission.answers==="object"?submission.answers:{};
  const entries=Object.entries(answers).filter(([,v])=>typeof v==="string");
  panel.append(make("h4","文字答案"));
  if(entries.length===0)panel.append(make("p","本關以照片為主要成果，沒有必填文字。"));
  for(const [key,value] of entries.slice(0,30))panel.append(make("p",(ANSWER_LABELS[key]||key)+"："+value));
  body.append(panel);
  const paths=submission.photoPaths&&typeof submission.photoPaths==="object"?submission.photoPaths:{};
  const gallery=make("section",undefined,"task-box");
  gallery.append(make("h4","本組提交照片"));
  const grid=make("div",undefined,"shared-results-grid");
  gallery.append(grid);
  body.append(gallery);
  const names=PHOTO_LABELS[Number(missionId)]||{};
  for(const [key,path] of Object.entries(paths).slice(0,13)){
   const cell=make("div",undefined,"shared-result-photo");
   cell.append(make("strong",names[key]||key));
   const msg=make("p","照片載入中…","small-note");
   cell.append(msg);grid.append(cell);
   if(!Object.hasOwn(names,key)||!valid(group,missionId,key,path)){
    msg.textContent="照片路徑不符合本組任務";continue;
   }
   void (async()=>{
    try{
     const blob=await Promise.race([
      getBlob(ref(storage,path),2*1024*1024),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("載入逾時，請檢查網路後重新進入關卡。")),15000))
     ]);
     if(generation!==activeGeneration||!cell.isConnected)return;
     const bytes=new Uint8Array(await blob.slice(0,3).arrayBuffer());
     if(blob.size<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)
      throw Error("照片格式異常");
     if(generation!==activeGeneration||!cell.isConnected)return;
     const url=URL.createObjectURL(new Blob([blob],{type:"image/jpeg"}));
     activeUrls.add(url);
     const img=document.createElement("img");
     img.alt=names[key]||"本組照片";img.loading="lazy";
     img.onerror=()=>{if(generation===activeGeneration)msg.textContent="照片無法顯示";URL.revokeObjectURL(url);activeUrls.delete(url);};
     img.onload=()=>{if(generation===activeGeneration&&msg.isConnected)msg.remove();};
     cell.append(img);img.src=url;
    }catch(err){
     if(generation===activeGeneration&&msg.isConnected)
      msg.textContent=err?.code==="storage/unauthorized"?"沒有查看照片的權限":"照片載入失敗："+(err?.message||"未知錯誤");
    }
   })();
  }
  if(!grid.children.length)grid.append(make("p","這關沒有可顯示的照片。"));
  return true;
 }
 return {show,reset};
}
