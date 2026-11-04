// Isolated pilot2026 browser integration candidate. Not activated for writes.
// Even if a user edits browser JS, the currently deployed Function rejects pilot2026.
import {watchAuth,studentSignIn} from "./firebase-auth.js";
import {joinByInvitation,resumeGroup,watchGroupMissions,db} from "./group-service.js";
import {doc,getDoc} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {submitOriginalMission} from "./mission-cloud-flow.js";

const ACTIVITY_ID="pilot2026";
const ALLOWED_GROUPS=Object.freeze(["group01","group02","group03"]);
const ALLOWED_MISSIONS=Object.freeze([1,2,3,4,5]);
const SUBMISSIONS_ENABLED=false; // NEVER switch on before approved server rollout.
let group=null,unsubscribe=null,submitting=false,readyCount=0;
const completed=new Set(),seen=new Set();
const status=document.getElementById("cloudStatus");
const feedback=document.getElementById("cloudFeedback");
const dashboardStatus=document.getElementById("cloudDashboardStatus");
const joinButton=document.getElementById("cloudJoin");
const loginButton=document.getElementById("cloudLogin");
const inviteInput=document.getElementById("cloudInvite");
function notice(message){feedback.textContent=String(message);}
function allowed(g){return g?.activityId===ACTIVITY_ID && ALLOWED_GROUPS.includes(g.groupId);}
function stop(){unsubscribe?.();unsubscribe=null;group=null;completed.clear();seen.clear();readyCount=0;}
function showJoin(){
 document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id==="startScreen"));
 document.getElementById("homeBtn")?.classList.add("hidden");
}
window.cloudQuestCompleted=id=>completed.has(Number(id));
window.cloudQuestMaySubmit=id=>SUBMISSIONS_ENABLED && allowed(group) && ALLOWED_MISSIONS.includes(Number(id)) && !completed.has(Number(id)) && !submitting && readyCount===5;
window.cloudQuestSubmit=async(missionId,formData)=>{
 if(!window.cloudQuestMaySubmit(missionId))throw Error("pilot2026 尚未開放雲端提交，請勿使用真實照片");
 if(submitting)throw Error("提交處理中");
 submitting=true;
 try{return await submitOriginalMission({missionId,formData,onProgress:notice});}
 finally{submitting=false;}
};
function render(){
 status.textContent=group?`身分：${group.studentCode}｜${group.groupId}\n活動：pilot2026\n同步：${readyCount===5?"已連線":"讀取中"}\n模式：待啟用，不接受雲端提交`:"尚未加入 pilot2026 測試小組";
 dashboardStatus.textContent=group?`pilot2026｜${group.groupId}｜已完成 ${completed.size}/5｜${readyCount===5?"已同步":"同步中"}｜提交未開放`:"尚未加入試辦小組";
 joinButton.disabled=Boolean(group);
 if(group && document.getElementById("dashboardScreen")?.classList.contains("active"))window.showDashboard?.();
}
function activate(g){
 if(!allowed(g))throw Error("這個頁面只接受 pilot2026 的三個試辦小組");
 stop();group=g;
 window.cloudQuestActivate(g);
 unsubscribe=watchGroupMissions(g,(id,data)=>{
  if(!seen.has(id)){seen.add(id);readyCount++;}
  if(data?.status==="completed")completed.add(Number(id));
  else completed.delete(Number(id));
  render();
 },err=>notice("同步失敗："+err.message));
 render();
}
async function restore(){
 const g=await resumeGroup();
 if(g && allowed(g))activate(g);
 else {stop();showJoin();render();if(g)notice("目前登入身分屬於其他活動，請使用獨立測試瀏覽器以免影響原本學生身分。");}
}
loginButton.onclick=async()=>{
 loginButton.disabled=true;
 try{await studentSignIn();await restore();notice("登入完成。請輸入老師私下提供的 pilot2026 一次性邀請碼。");}
 catch(err){notice(err.message);}
 finally{loginButton.disabled=false;}
};
joinButton.onclick=async()=>{
 joinButton.disabled=true;
 try{
  await studentSignIn();
  // Existing one-time invitation transaction validates group membership.
  // A demo2026 invite must NEVER enroll the user through this pilot page.
  const token=inviteInput.value.trim();
  if(!/^[a-f0-9]{48}$/i.test(token))throw Error("加入碼格式不正確");
  const invite=await getDoc(doc(db,"invites",token));
  if(!invite.exists() || invite.data().activityId!==ACTIVITY_ID || !ALLOWED_GROUPS.includes(invite.data().groupId))
    throw Error("這張加入碼不屬於 pilot2026，未領取，請聯絡老師");
  const g=await joinByInvitation(token);
  if(!allowed(g))throw Error("這張邀請碼不是 pilot2026 的試辦活動，請停止並聯絡老師");
  activate(g);inviteInput.value="";notice("加入試辦小組成功。五關雲端提交目前仍關閉。");
 }catch(err){notice("加入失敗："+err.message);}
 finally{joinButton.disabled=Boolean(group);}
};
watchAuth(user=>{
 if(!user?.isAnonymous){stop();showJoin();render();return;}
 void restore().catch(err=>{stop();showJoin();notice("恢復失敗："+err.message);render();});
});
window.addEventListener("beforeunload",()=>unsubscribe?.());
render();
