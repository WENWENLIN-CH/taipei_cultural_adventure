// Cloud quest preview: isolated from the original GitHub Pages student site.
// Submission is intentionally switched OFF until the callable function is
// deployed and a safe partial-upload recovery is verified.
import {watchAuth,studentSignIn} from "./firebase-auth.js";
import {joinByInvitation,resumeGroup,watchGroupMissions} from "./group-service.js";
import {submitOriginalMission} from "./mission-cloud-flow.js";

const SUBMISSIONS_ENABLED=false;
let group=null,unsubscribe=null;
const status=document.getElementById("cloudStatus");
const inviteInput=document.getElementById("cloudInvite");
const feedback=document.getElementById("cloudFeedback");
const dashboardStatus=document.getElementById("cloudDashboardStatus");
const joinButton=document.getElementById("cloudJoin");
const loginButton=document.getElementById("cloudLogin");
const completed=new Set();
const completedSnapshots=new Map();
let readyCount=0;
let submitting=false;

function notice(text){feedback.textContent=text;}
function completedMission(id){return completed.has(Number(id));}
window.cloudQuestCompleted=completedMission;
window.cloudQuestIsReady=()=>Boolean(group);
window.cloudQuestSubmit=async(missionId,formData)=>{
  if(!group)throw Error("請先以專屬加入碼加入小組");
  if(!SUBMISSIONS_ENABLED)throw Error("雲端任務提交尚未開放，這一版只測試加入小組與共享進度。");
  if(submitting)throw Error("正在提交，請勿重複點擊");
  if(completedMission(missionId))throw Error("這關已有一份小組共同成果");
  submitting=true;
  try{
    return await submitOriginalMission({missionId,formData,onProgress:notice});
  }finally{submitting=false;}
};
function render(){
  const name=group ? `${group.studentCode}｜${group.groupId}` : "尚未加入小組";
  status.textContent=`Firebase 小組身分：${name}\n同步狀態：${group?(readyCount===5?"已連線":"連線中"):"未連線"}\n目前模式：僅共享進度預覽，禁止正式提交`;
  dashboardStatus.textContent=group ? `小組：${group.groupId}｜我的代碼：${group.studentCode}｜已完成：${completed.size}／5｜${readyCount===5?"即時同步已連線":"進度讀取中"}` : "尚未加入小組";
  joinButton.disabled=Boolean(group);
  // Keep island pin badges consistent with passport count after each Firestore snapshot.
  document.querySelectorAll(".map-mission").forEach(btn=>{
    const done=completedMission(btn.dataset.mission);
    btn.classList.toggle("done",done);
    const badge=btn.querySelector(".pin-state");
    if(badge)badge.textContent=done?"✓":"?";
  });
  const screen=document.getElementById("dashboardScreen");
  if(group && screen?.classList.contains("active")) window.showDashboard?.();
}
function joinUi(){
  document.getElementById("startScreen").classList.add("active");
  document.querySelectorAll(".screen").forEach(screen=>{
    if(screen.id!=="startScreen")screen.classList.remove("active");
  });
}
function startGroup(g){
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  group=g;completed.clear();completedSnapshots.clear();readyCount=0;
  window.cloudQuestActivate(g);
  unsubscribe=watchGroupMissions(g,(id,data)=>{
    if(!completedSnapshots.has(id))readyCount++;
    completedSnapshots.set(id,data);
    if(data?.status==="completed")completed.add(id);else completed.delete(id);
    render();
  },err=>notice("同步失敗："+err.message));
  render();
}
async function recover(){
  try{
    const g=await resumeGroup();
    if(g)startGroup(g); else{joinUi();render();}
  }catch(err){joinUi();notice("恢復小組失敗："+err.message);}
}
loginButton.onclick=async()=>{
  loginButton.disabled=true;
  try{await studentSignIn();await recover();notice("匿名登入成功。若還沒加入小組，請輸入老師提供的專屬加入碼。");}
  catch(err){notice(err.message);}
  finally{loginButton.disabled=false;}
};
joinButton.onclick=async()=>{
  joinButton.disabled=true;
  try{
    await studentSignIn();
    const g=await joinByInvitation(inviteInput.value);
    startGroup(g);
    notice("加入成功！這個小組的五關進度會同步顯示。");
    inviteInput.value="";
  }catch(err){notice("加入失敗："+err.message);}
  finally{render();}
};
watchAuth(async user=>{
  if(!user?.isAnonymous){
    if(unsubscribe){unsubscribe();unsubscribe=null;}
    group=null;completed.clear();readyCount=0;
    joinUi();render();return;
  }
  await recover();
});
window.addEventListener("beforeunload",()=>unsubscribe?.());
render();
