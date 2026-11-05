// Phase2 student candidate. No live write until the real event is configured and deployed.
import {watchAuth,studentSignIn} from "./firebase-auth.js";
import {joinByInvitation,resumeGroup,watchGroupMissions,db} from "./group-service.js";
import {doc,getDoc} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
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
 if(!allowed(g))throw Error("這張加入碼不屬於本次活動");
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
 try{await studentSignIn();await restore();notice(enabled?"請輸入老師提供的個人一次性加入碼。":"活動尚未啟用");}
 catch(err){notice(err.message);}
 finally{loginButton.disabled=false;}
};
joinButton.onclick=async()=>{
 joinButton.disabled=true;
 try{
  if(!enabled)throw Error("活動尚未啟用");
  await studentSignIn();
  const prior=await resumeGroup();
  if(prior&&!allowed(prior))throw Error("目前登入身分已屬其他活動，請改用其他瀏覽器設定檔");
  const token=inviteInput.value.trim();
  if(!/^[a-f0-9]{48}$/i.test(token))throw Error("加入碼格式錯誤");
  const snap=await getDoc(doc(db,"invites",token));
  if(!snap.exists()||snap.data().activityId!==activityId||!groups.includes(snap.data().groupId))
   throw Error("加入碼不屬於本活動");
  const g=await joinByInvitation(token);
  activate(g);inviteInput.value="";notice("加入成功！組員共同分享五關進度。");
 }catch(err){notice("加入失敗："+err.message);}
 finally{render();}
};
watchAuth(user=>{
 if(!user?.isAnonymous){stop();showJoin();render();return;}
 void restore().catch(err=>{stop();showJoin();render();notice("恢復小組失敗："+err.message);});
});
window.addEventListener("beforeunload",()=>unsubscribe?.());
render();
