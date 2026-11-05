// Phase2 student candidate. No live write until the real event is configured and deployed.
import {watchAuth,studentSignIn,auth} from "./firebase-auth.js";
import {resumeGroup,watchGroupMissions,cacheVerifiedGroup} from "./group-service.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import {readAndClearPhase2Qr} from "./phase2-qr-link.js";
import {submitOriginalMission} from "./mission-cloud-flow.js";
import {submitPhase2Mission} from "./phase2-submission.js";
import {PHASE2_EVENT} from "./phase2-event-config.js";

const enabled=PHASE2_EVENT.enabled===true;
const activityId=PHASE2_EVENT.activityId;
const groups=PHASE2_EVENT.groups;
let group=null,unsubscribe=null,submitting=false,readyCount=0;
const completed=new Set(),seen=new Set();
const status=document.getElementById("cloudStatus");
const feedback=document.getElementById("cloudFeedback");
const dashboardStatus=document.getElementById("cloudDashboardStatus");
const joinButton=document.getElementById("cloudJoin");
const loginButton=document.getElementById("cloudLogin");
const inviteInput=document.getElementById("cloudInvite");
const scannedQr=readAndClearPhase2Qr(window.location,window.history);
let qrPending=scannedQr.kind==="valid"?scannedQr:null;
let joining=false;
if(scannedQr.kind==="invalid")notice("QR Code 格式錯誤，請重新掃描老師提供的組別 QR Code");
const notice=s=>{feedback.textContent=String(s);};
const allowed=g=>g?.activityId===activityId && groups.includes(g.groupId);
function stop(){unsubscribe?.();unsubscribe=null;group=null;completed.clear();seen.clear();readyCount=0;}
function showJoin(){
 document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id==="startScreen"));
 document.getElementById("homeBtn")?.classList.add("hidden");
}
window.cloudQuestCompleted=id=>completed.has(Number(id));
window.cloudQuestMaySubmit=id=>enabled && allowed(group) && seen.size===5 && !submitting &&
 Number.isInteger(Number(id)) && Number(id)>=1 && Number(id)<=5 &&
 !completed.has(Number(id)) && (Number(id)===1||completed.has(Number(id)-1));
window.cloudQuestSubmit=async(missionId,formData)=>{
 if(!window.cloudQuestMaySubmit(missionId))throw Error("目前無法提交：請確認活動已開放、上關已完成及同步已連線");
 submitting=true;
 try{return await submitOriginalMission({missionId,formData,onProgress:notice,submitMission:submitPhase2Mission});}
 finally{submitting=false;}
};
function render(){
 const progress=group?`${group.groupId}｜${group.studentCode}｜已完成 ${completed.size}/5`:"尚未加入活動";
 status.textContent=`${progress}\n同步：${seen.size===5?"已連線":"讀取中"}\n提交：${enabled?"活動模式":"尚未啟用"}`;
 dashboardStatus.textContent=progress+(group?`｜${seen.size===5?"雲端同步成功":"連線中"}`:"");
 joinButton.disabled=Boolean(group)||!enabled;
 if(group && document.getElementById("dashboardScreen")?.classList.contains("active"))
  window.showDashboard?.();
 if(document.getElementById("missionScreen")?.classList.contains("active")){
  const button=document.getElementById("completeMissionBtn");
  if(button){
   const mission=Number(document.querySelector(".mission-detail-card .eyebrow")?.textContent?.match(/\d+/)?.[0]);
   if(Number.isInteger(mission))button.disabled=!window.cloudQuestMaySubmit(mission);
  }
 }
}
function activate(g){
 if(!allowed(g))throw Error("這張 QR Code 不屬於本次活動");
 stop();group=g;window.cloudQuestActivate(g);
 unsubscribe=watchGroupMissions(g,(id,data)=>{
  seen.add(Number(id));
  if(data?.status==="completed")completed.add(Number(id));
  else completed.delete(Number(id));
  render();
 },err=>notice("雲端同步失敗："+err.message));
 render();
}
async function restore(){
 const existing=await resumeGroup();
 if(existing && allowed(existing))activate(existing);
 else{
  stop();showJoin();render();
  if(existing)notice("這個瀏覽器已加入另一個活動，請勿直接覆寫原有身分");
 }
}
loginButton.onclick=async()=>{
 loginButton.disabled=true;
 try{await studentSignIn();await restore();notice(enabled?"請掃描老師提供的組別 QR Code。":"活動尚未啟用");}
 catch(err){notice(err.message);}
 finally{loginButton.disabled=false;}
};
// A URL fragment holds the reusable per-group secret, then disappears from the URL.
// No user-visible code entry is needed. Same phone restores the membership cache.
inviteInput.closest("label")?.setAttribute("hidden","");
joinButton.hidden=true;
async function autoJoin(){
 if(joining||!qrPending||!enabled)return;
 joining=true;
 const pending=qrPending;
 try{
  const prior=await resumeGroup();
  if(prior){
   if(allowed(prior)){qrPending=null;activate(prior);return;}
   throw Error("此手機已加入其他活動，請使用未加入過活動的瀏覽器");
  }
  const {data}=await httpsCallable(getFunctions(auth.app,"asia-east1"),"joinPhase2Group")({groupId:pending.groupId,code:pending.code});
  if(!allowed(data)||!data.studentCode)throw Error("後端回傳了無效的小組");
  cacheVerifiedGroup(data);qrPending=null;activate(data);
  notice("加入成功！本組 QR Code 可以供其他組員重複掃描。");
 }catch(err){notice("掃碼加入失敗："+err.message);}
 finally{joining=false;render();}
}
joinButton.onclick=()=>void autoJoin();
watchAuth(user=>{
 if(!user?.isAnonymous){
  stop();showJoin();render();
  if(!user&&qrPending)void studentSignIn().catch(err=>notice("匿名登入失敗："+err.message));
  return;
 }
 void restore().then(()=>{if(!group)void autoJoin();}).catch(err=>{stop();showJoin();render();notice("恢復小組失敗："+err.message);});
});
window.addEventListener("beforeunload",()=>unsubscribe?.());
render();
