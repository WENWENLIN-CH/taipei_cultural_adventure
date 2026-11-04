// pilot2026 rehearsal only. No Firebase imports, no uploads, no server writes.
// This file never marks a mission completed and never unlocks FINAL.
import {extractMissionForm} from "./mission-form-adapter.js";
const group={activityId:"pilot2026",groupId:"group01",studentCode:"REHEARSAL"};
const feedback=document.getElementById("cloudFeedback");
const status=document.getElementById("cloudStatus");
const dashboardStatus=document.getElementById("cloudDashboardStatus");
const login=document.getElementById("cloudLogin");
const join=document.getElementById("cloudJoin");
const invite=document.getElementById("cloudInvite");
let submitting=false;
window.cloudQuestCompleted=()=>false;
window.cloudQuestIsReady=()=>true;
window.cloudQuestMaySubmit=(id)=>!submitting && Number.isInteger(Number(id)) && Number(id)>=1 && Number(id)<=5;
window.cloudQuestSubmit=async(missionId,formData)=>{
 if(submitting)throw Error("請勿重複點擊");
 submitting=true;
 try{
  const {answers,localPhotos}=extractMissionForm(missionId,formData);
  const count=Object.keys(localPhotos).length;
  const answerCount=Object.keys(answers).length;
  feedback.textContent=`✅ 第 ${missionId} 關本機檢查通過：${answerCount} 個文字欄位、${count} 張測試照片。\n這只是介面演練，沒有上傳雲端，也沒有建立完成紀錄。`;
  return {mode:"local-rehearsal",missionId:Number(missionId),validatedPhotos:count};
 }finally{submitting=false;}
};
window.cloudQuestActivate=()=>{
 document.getElementById("startScreen").classList.remove("active");
 document.getElementById("dashboardScreen").classList.add("active");
 window.showDashboard?.();
};
login.disabled=true;
login.hidden=true;
join.textContent="開始五關本機演練";
invite.disabled=true;invite.hidden=true;
const inviteLabel=invite.closest("label");
if(inviteLabel)inviteLabel.hidden=true;
status.textContent="目前模式：pilot2026 五關本機提交演練（不連 Firebase、不上傳照片）";
dashboardStatus.textContent="演練模式｜不登入、不存雲端｜已完成 0／5｜最後謎題維持鎖定";
join.onclick=()=>{
 window.cloudQuestActivate(group);
 feedback.textContent="可以逐關練習填寫與拍照。按提交只會檢查欄位，不會上傳或變更進度。";
};
