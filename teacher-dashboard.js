// Standalone read-only teacher dashboard. Firestore/Storage rules enforce
// authorization; displaying the page or email login alone grants no role.
import {auth,teacherSignIn,logout,watchAuth} from "./firebase-auth.js";
import {getFirestore,doc,getDoc,collection,getDocs} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {getStorage,ref,getBlob} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";

const activityId="demo2026";
const missionNames=["星月偵查員","異國文字解密","Halal 大搜查","環遊世界美食家","揭秘南洋商店"];
const loginPanel=document.getElementById("loginPanel");
const loginForm=document.getElementById("loginForm");
const loginButton=document.getElementById("loginButton");
const loginStatus=document.getElementById("loginStatus");
const board=document.getElementById("board");
const boardStatus=document.getElementById("boardStatus");
const groupGrid=document.getElementById("groupGrid");
const details=document.getElementById("details");
const detailHeading=document.getElementById("detailHeading");
const detailStatus=document.getElementById("detailStatus");
const missionDetails=document.getElementById("missionDetails");
const logoutButton=document.getElementById("logoutButton");
const db=auth?getFirestore(auth.app):null;
const storage=auth?getStorage(auth.app):null;
let currentGeneration=0;
const activeUrls=new Set();
function revokeImages(){
 for(const url of activeUrls)URL.revokeObjectURL(url);
 activeUrls.clear();
}
function reset(){
 currentGeneration++;
 revokeImages();
 board.classList.add("hidden");
 details.classList.add("hidden");
 groupGrid.replaceChildren();
 missionDetails.replaceChildren();
}
function text(tag,value,className){
 const element=document.createElement(tag);
 element.textContent=String(value);
 if(className)element.className=className;
 return element;
}
function errorMessage(err){
 if(err?.code==="permission-denied" || err?.code==="storage/unauthorized")return "權限不足，請確認已由管理者設定教師權限。";
 return "載入失敗："+(err?.message||"未知錯誤");
}
async function authorize(user,generation){
 if(!user || user.isAnonymous)throw Error("請使用已核准的教師電子郵件帳號");
 const snap=await getDoc(doc(db,"teacherAccess",user.uid));
 if(generation!==currentGeneration)return false;
 if(!snap.exists() || snap.data().authorized!==true)throw Error("此帳號尚未取得教師資料存取授權");
 return true;
}
async function showBoard(user){
 const generation=++currentGeneration;
 revokeImages();
 board.classList.add("hidden");
 details.classList.add("hidden");
 loginStatus.textContent="正在確認教師權限…";
 try{
  if(!await authorize(user,generation))return;
  const rows=await getDocs(collection(db,"activities",activityId,"groups"));
  if(generation!==currentGeneration)return;
  loginPanel.classList.add("hidden");
  board.classList.remove("hidden");
  groupGrid.replaceChildren();
  const groups=rows.docs.slice().sort((a,b)=>a.id.localeCompare(b.id));
  boardStatus.textContent=groups.length?`已授權，找到 ${groups.length} 個小組。選擇小組查看成果。`:"目前沒有小組資料";
  for(const item of groups){
    const card=text("div","","group");
    card.append(text("h3",item.data().displayName||item.id),text("p",`小組代碼：${item.id}`,"muted"));
    const status=text("p","正在讀取五關進度…");
    const button=text("button","檢視這組成果");
    button.type="button";
    button.addEventListener("click",()=>void showGroup(item.id,item.data().displayName||item.id));
    card.append(status,button);
    groupGrid.append(card);
    // Do not request member or invite data for this dashboard.
    const snaps=await Promise.all([1,2,3,4,5].map(n=>getDoc(doc(db,"activities",activityId,"groups",item.id,"missions",String(n)))));
    if(generation!==currentGeneration)return;
    status.textContent=`已完成 ${snaps.filter(s=>s.exists()&&s.data().status==="completed").length}/5 關`;
  }
 }catch(err){
  if(generation!==currentGeneration)return;
  loginPanel.classList.remove("hidden");
  loginStatus.textContent=errorMessage(err);
  loginStatus.classList.add("error");
 }
}
async function showGroup(groupId,name){
 const generation=++currentGeneration;
 revokeImages();
 details.classList.remove("hidden");
 detailHeading.textContent=`${name}｜五關成果`;
 detailStatus.textContent="正在讀取…";
 missionDetails.replaceChildren();
 try{
  const snaps=await Promise.all([1,2,3,4,5].map(n=>getDoc(doc(db,"activities",activityId,"groups",groupId,"missions",String(n)))));
  if(generation!==currentGeneration)return;
  detailStatus.textContent=`已完成 ${snaps.filter(s=>s.exists()&&s.data().status==="completed").length}/5 關`;
  for(let i=0;i<5;i++){
   const snap=snaps[i];
   const box=text("section","","card");
   box.append(text("h3",`第 ${i+1} 關｜${missionNames[i]}`));
   if(!snap.exists()||snap.data().status!=="completed"){box.append(text("p","尚未完成","muted"));missionDetails.append(box);continue;}
   const data=snap.data();
   box.append(text("p",`狀態：已完成｜提交代碼：${data.submittedByCode||"未提供"}`));
   if(data.submittedAt?.toDate)box.append(text("p",`提交時間：${data.submittedAt.toDate().toLocaleString("zh-TW")}`));
   const answerBox=text("div","","answer");
   answerBox.append(text("h4","文字答案"));
   const answers=data.answers||{};
   for(const [key,value] of Object.entries(answers).slice(0,30)){
     answerBox.append(text("p",`${key}：${typeof value==="string"?value:JSON.stringify(value)}`));
   }
   box.append(answerBox);
   const paths=data.photoPaths||{};
   const photoBox=text("div","","photos");
   for(const [photoKey,path] of Object.entries(paths).slice(0,13)){
     const holder=text("div","");
     holder.append(text("p",photoKey));
     const imageStatus=text("small","載入照片中…");
     holder.append(imageStatus);photoBox.append(holder);
     if(typeof path!=="string"||!path.startsWith(`activities/${activityId}/groups/${groupId}/missions/${i+1}/`)||!path.endsWith(".jpg")){
       imageStatus.textContent="照片路徑異常";continue;
     }
     // Access-controlled bytes; do NOT create public download-token URLs.
     // Load each photo independently: a pending Storage request must NOT hide
     // this mission card or block rendering missions 4 and 5.
     void (async()=>{
       try{
         const blob=await getBlob(ref(storage,path),2*1024*1024);
         if(generation!==currentGeneration)return;
         if(blob.type!=="image/jpeg"){imageStatus.textContent="不是 JPEG";return;}
         const url=URL.createObjectURL(blob);
         activeUrls.add(url);
         const img=document.createElement("img");
         img.src=url;img.alt=`第${i+1}關 ${photoKey} 測試照片`;
         imageStatus.replaceWith(img);
       }catch(e){if(generation===currentGeneration)imageStatus.textContent=errorMessage(e);}
     })();
   }
   box.append(photoBox);missionDetails.append(box);
  }
 }catch(err){if(generation===currentGeneration)detailStatus.textContent=errorMessage(err);}
}
loginForm.addEventListener("submit",async event=>{
 event.preventDefault();
 loginButton.disabled=true;
 loginStatus.classList.remove("error");
 loginStatus.textContent="正在登入…";
 try{
  const email=document.getElementById("email").value.trim();
  const pass=document.getElementById("password").value;
  document.getElementById("password").value="";
  await teacherSignIn(email,pass);
 }catch(err){
  loginStatus.textContent=errorMessage(err);
  loginStatus.classList.add("error");
 }finally{loginButton.disabled=false;}
});
logoutButton.addEventListener("click",async()=>{
 try{await logout();reset();loginPanel.classList.remove("hidden");loginStatus.textContent="教師已登出";}catch(err){loginStatus.textContent=errorMessage(err);}
});
watchAuth(user=>{
 reset();
 if(user&&!user.isAnonymous){void showBoard(user);}
 else{
  loginPanel.classList.remove("hidden");
  loginStatus.textContent=user?.isAnonymous?
    "目前瀏覽器是學生匿名身分。請改用另一個瀏覽器設定檔登入教師，避免登出學生。":"請以授權教師帳號登入";
 }
});
window.addEventListener("beforeunload",revokeImages);
