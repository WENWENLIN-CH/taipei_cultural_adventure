
const TEACHER_PASSWORD_HASH = "77052b8dc342b75350bfb43451cf57d2ff4544fe0a0ec73a04e9ef6080c44306"; // SHA-256 of teacher password
const STORAGE_KEY = "taipeiCulturalQuestV1";

const missions = [
  {
    id: 1, emoji: "🌙", title: "星月偵查員",
    short: "尋找星月標誌",
    intro: "在臺北市區尋找一個與伊斯蘭文化相關的「星月」標誌。",
    tip: "公共場所的祈禱室、穆斯林友善設施附近，可能會看見這個符號。",
    fields: [
      {type:"text", key:"location", label:"你在哪裡找到？", placeholder:"例如：臺北車站○○區"},
      {type:"photo", key:"photo1", label:"拍下你找到的星月標誌"}
    ]
  },
  {
    id: 2, emoji: "🔤", title: "異國文字解密",
    short: "找到 4 種非中文商店招牌",
    intro: "在臺北市區尋找至少 4 種中文以外的語言，且必須是商店招牌。",
    tip: "四張照片必須代表四種不同語言，例如英文、日文、韓文、泰文、越南文、印尼文等。",
    fields: [
      {type:"pair", key:"lang1", label:"語言 1"},
      {type:"pair", key:"lang2", label:"語言 2"},
      {type:"pair", key:"lang3", label:"語言 3"},
      {type:"pair", key:"lang4", label:"語言 4"}
    ]
  },
  {
    id: 3, emoji: "🕌", title: "Halal大搜查",
    short: "尋找有清真認證的餐廳",
    intro: "找到一間具有 Halal／清真認證的餐廳。",
    tip: "賣印度料理、中東料理或沒有豬肉，不一定代表有清真認證。請找到真正的認證或 Halal 標示。",
    fields: [
      {type:"text", key:"restaurant", label:"餐廳名稱", placeholder:"輸入餐廳名稱"},
      {type:"photo", key:"photo1", label:"拍攝餐廳招牌"},
      {type:"photo", key:"photo2", label:"拍攝清真認證／Halal 標示"}
    ]
  },
  {
    id: 4, emoji: "🌍", title: "環遊世界美食家",
    short: "從五大洲中完成 3 洲",
    intro: "從亞洲、歐洲、非洲、美洲、大洋洲中，選擇 3 個不同洲，尋找代表不同國家料理的餐廳。",
    tip: "三間餐廳必須來自不同洲。",
    fields: [
      {type:"continent", key:"c1", label:"餐廳 1"},
      {type:"continent", key:"c2", label:"餐廳 2"},
      {type:"continent", key:"c3", label:"餐廳 3"}
    ]
  },
  {
    id: 5, emoji: "🍬", title: "揭秘南洋商店",
    short: "找到 3 個不同國家的零食",
    intro: "進入東南亞超市或販售異國食品的商店，尋找來自 3 個不同國家的零食或食品。",
    tip: "三樣商品必須來自不同國家，例如菲律賓、印尼、越南、泰國、馬來西亞等。",
    fields: [
      {type:"product", key:"p1", label:"商品 1"},
      {type:"product", key:"p2", label:"商品 2"},
      {type:"product", key:"p3", label:"商品 3"}
    ]
  }
];

let state = loadState() || {
  started:false, teamName:"", members:"",
  missions:{}, teacherUnlocked:false, finalSolved:false
};

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.getElementById("homeBtn").classList.toggle("hidden", id==="startScreen");
  window.scrollTo({top:0,behavior:"smooth"});
}
function init(){
  if(state.started){
    showDashboard();
  }else{
    showScreen("startScreen");
  }
}
document.getElementById("startBtn").addEventListener("click",()=>{
  const team = document.getElementById("teamName").value.trim();
  if(!team){ alert("請先輸入組別名稱"); return; }
  state.started = true;
  state.teamName = team;
  state.members = document.getElementById("members").value.trim();
  saveState();
  showDashboard();
});
document.getElementById("homeBtn").addEventListener("click",showDashboard);
document.getElementById("backToDashboard").addEventListener("click",showDashboard);
document.getElementById("backFromFinal").addEventListener("click",showDashboard);

function doneCount(){
  return missions.filter(m=>state.missions?.[m.id]?.completed).length;
}
function finalUnlocked(){
  return doneCount()===5 || state.teacherUnlocked;
}
function showDashboard(){
  showScreen("dashboardScreen");
  const count = doneCount();

  document.getElementById("doneCount").textContent = count;
  const percent = document.getElementById("progressPercent");
  if(percent) percent.textContent = `${count*20}%`;

  const passport = document.getElementById("passportStamps");
  if(passport){
    passport.innerHTML = missions.map(m=>{
      const done = !!state.missions?.[m.id]?.completed;
      return `<span class="stamp ${done?"done":""}" title="${m.title}">${done?m.emoji:"❔"}</span>`;
    }).join("");
  }

  document.querySelectorAll(".map-mission").forEach(btn=>{
    const id = Number(btn.dataset.mission);
    const done = !!state.missions?.[id]?.completed;
    btn.classList.toggle("done", done);
    const badge = btn.querySelector(".pin-state");
    if(badge) badge.textContent = done ? "✓" : "?";
    btn.onclick = ()=>openMission(id);
  });

  const unlocked = finalUnlocked();
  const card = document.getElementById("finalLockCard");
  const btn = document.getElementById("finalMissionBtn");
  card.classList.toggle("unlocked", unlocked);
  card.classList.toggle("locked", !unlocked);
  btn.disabled = !unlocked;
  btn.classList.toggle("unlocked", unlocked);

  const lockIcon = btn.querySelector(".final-lock");
  if(lockIcon) lockIcon.textContent = unlocked ? "🔓" : "🔒";

  const temple = document.getElementById("finalTempleVisual");
  if(temple) temple.classList.toggle("unlocked", unlocked);

  const lockText = document.getElementById("finalLockText");
  if(unlocked){
    lockText.textContent = state.teacherUnlocked && count<5
      ? "老師已啟動備援解鎖"
      : "終極任務已解鎖！";
  }else{
    lockText.textContent = `還差 ${5-count} 關`;
  }
}
document.getElementById("finalMissionBtn").addEventListener("click",()=>{
  if(finalUnlocked()) showScreen("finalScreen");
});

function getMissionState(id){
  state.missions[id] ||= {completed:false, data:{}};
  return state.missions[id];
}
function openMission(id){
  const m = missions.find(x=>x.id===id);
  const ms = getMissionState(id);
  const wrap = document.getElementById("missionDetail");
  wrap.innerHTML = `
    <div class="mission-detail-card">
      <div class="mission-head">
        <div class="big">${m.emoji}</div>
        <p class="eyebrow" style="color:#d7eee9">MISSION ${m.id}</p>
        <h2>${m.title}</h2>
        <p>${m.intro}</p>
      </div>
      <div class="mission-body">
        <div class="task-box">
          <h4>💡 任務提示</h4>
          <p>${m.tip}</p>
        </div>
        <div id="missionFields"></div>
        <label class="checkline">
          <input id="safetyCheck" type="checkbox" ${ms.data.safetyCheck?"checked":""}/>
          <span>我確認拍攝時沒有妨礙店家營業，也沒有拍攝陌生人的正臉。</span>
        </label>
        <button id="completeMissionBtn" class="primary-btn complete-btn">${ms.completed?"✓ 已完成此任務":"完成任務"}</button>
        <p class="small-note">文字與任務進度會自動保存在這支手機。照片也會暫存在此裝置中。</p>
      </div>
    </div>
  `;
  renderFields(m, ms);
  document.getElementById("safetyCheck").addEventListener("change",e=>{
    ms.data.safetyCheck = e.target.checked; saveState();
  });
  document.getElementById("completeMissionBtn").addEventListener("click", async ()=>{
    if(!validateMission(m, ms)){
      alert("還有必要資料或照片尚未完成，請再檢查一次。");
      return;
    }
    ms.completed = true;
    saveState();
    alert("MISSION CLEAR！🎉\n文化印章已收入護照。");
    showDashboard();
  });
  showScreen("missionScreen");
}

function renderFields(m, ms){
  const holder = document.getElementById("missionFields");
  holder.innerHTML = "";
  m.fields.forEach(field=>{
    const box = document.createElement("div");
    box.className = "task-box";
    if(field.type==="text"){
      box.innerHTML = `<h4>${field.label}</h4><input data-key="${field.key}" type="text" value="${escapeAttr(ms.data[field.key]||"")}" placeholder="${field.placeholder||""}">`;
    } else if(field.type==="photo"){
      box.innerHTML = photoFieldHTML(field.key, field.label, ms.data[field.key]);
    } else if(field.type==="pair"){
      box.innerHTML = `
        <h4>${field.label}</h4>
        <input data-key="${field.key}_lang" type="text" value="${escapeAttr(ms.data[field.key+"_lang"]||"")}" placeholder="語言名稱">
        ${photoFieldHTML(field.key+"_photo","商店招牌照片",ms.data[field.key+"_photo"])}
      `;
    } else if(field.type==="continent"){
      box.innerHTML = `
        <h4>${field.label}</h4>
        <select data-key="${field.key}_continent">
          ${["","亞洲","歐洲","非洲","美洲","大洋洲"].map(v=>`<option value="${v}" ${ms.data[field.key+"_continent"]===v?"selected":""}>${v||"選擇洲別"}</option>`).join("")}
        </select>
        <input data-key="${field.key}_country" type="text" value="${escapeAttr(ms.data[field.key+"_country"]||"")}" placeholder="料理國家">
        <input data-key="${field.key}_restaurant" type="text" value="${escapeAttr(ms.data[field.key+"_restaurant"]||"")}" placeholder="餐廳名稱">
        ${photoFieldHTML(field.key+"_photo","餐廳招牌照片",ms.data[field.key+"_photo"])}
      `;
    } else if(field.type==="product"){
      box.innerHTML = `
        <h4>${field.label}</h4>
        <input data-key="${field.key}_country" type="text" value="${escapeAttr(ms.data[field.key+"_country"]||"")}" placeholder="產品來自國家">
        <input data-key="${field.key}_name" type="text" value="${escapeAttr(ms.data[field.key+"_name"]||"")}" placeholder="產品名稱">
        ${photoFieldHTML(field.key+"_photo","產品照片",ms.data[field.key+"_photo"])}
      `;
    }
    holder.appendChild(box);
  });

  holder.querySelectorAll("[data-key]").forEach(el=>{
    const key = el.dataset.key;
    if(el.type==="file"){
      el.addEventListener("change", async e=>{
        const file = e.target.files?.[0];
        if(!file) return;
        const dataUrl = await compressImage(file);
        ms.data[key] = dataUrl;
        saveState();
        const img = el.parentElement.querySelector(".photo-preview");
        img.src = dataUrl; img.classList.remove("hidden");
      });
    }else{
      el.addEventListener("input",()=>{ ms.data[key]=el.value; saveState(); });
      el.addEventListener("change",()=>{ ms.data[key]=el.value; saveState(); });
    }
  });
}

function photoFieldHTML(key,label,value){
  return `
    <div class="photo-slot">
      <strong>${label}</strong>
      <label class="photo-picker-label" for="photo-${key}">📷 選擇照片（可從相簿挑選）</label>
      <input id="photo-${key}" data-key="${key}" type="file" accept="image/*">
      <small class="photo-picker-tip">可選擇手機相簿裡的照片；部分手機也會提供拍照選項。</small>
      <img class="photo-preview ${value?"":"hidden"}" src="${value||""}" alt="任務照片預覽">
    </div>
  `;
}
function escapeAttr(str){
  return String(str).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
async function compressImage(file){
  const img = await createImageBitmap(file);
  const max = 720;
  const scale = Math.min(1, max/Math.max(img.width,img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width*scale);
  canvas.height = Math.round(img.height*scale);
  canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",0.58);
}
function validateMission(m, ms){
  if(!ms.data.safetyCheck) return false;
  const d = ms.data;
  if(m.id===1) return d.location && d.photo1;
  if(m.id===2){
    const langs = ["lang1","lang2","lang3","lang4"];
    const names = langs.map(k=>(d[k+"_lang"]||"").trim().toLowerCase());
    return langs.every(k=>d[k+"_lang"] && d[k+"_photo"]) && new Set(names).size===4;
  }
  if(m.id===3) return d.restaurant && d.photo1 && d.photo2;
  if(m.id===4){
    const ks=["c1","c2","c3"];
    const continents=ks.map(k=>d[k+"_continent"]);
    return ks.every(k=>d[k+"_continent"]&&d[k+"_country"]&&d[k+"_restaurant"]&&d[k+"_photo"]) && new Set(continents).size===3;
  }
  if(m.id===5){
    const ks=["p1","p2","p3"];
    const countries=ks.map(k=>(d[k+"_country"]||"").trim().toLowerCase());
    return ks.every(k=>d[k+"_country"]&&d[k+"_name"]&&d[k+"_photo"]) && new Set(countries).size===3;
  }
  return false;
}

document.getElementById("teacherHelpBtn").addEventListener("click",()=>{
  document.getElementById("teacherPassword").value="";
  document.getElementById("teacherError").classList.add("hidden");
  document.getElementById("teacherDialog").showModal();
});
document.getElementById("teacherUnlockBtn").addEventListener("click", async ()=>{
  const value = document.getElementById("teacherPassword").value.trim();
  const hash = await sha256(value);
  if(hash===TEACHER_PASSWORD_HASH){
    state.teacherUnlocked = true;
    saveState();
    document.getElementById("teacherDialog").close();
    showDashboard();
    setTimeout(()=>alert("終極任務已由帶隊老師解鎖。"),50);
  }else{
    document.getElementById("teacherError").classList.remove("hidden");
  }
});
async function sha256(text){
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

document.getElementById("checkStationBtn").addEventListener("click",()=>{
  const a = document.getElementById("riddle1").value.trim();
  const b = document.getElementById("riddle2").value.trim();
  const result = document.getElementById("stationResult");
  result.classList.remove("hidden","error");
  if(a==="圓" && b==="山"){
    result.innerHTML = "🎉 第一層破解成功！<br><strong>圓山站</strong>";
    document.getElementById("exitPuzzle").classList.remove("hidden");
  }else{
    result.textContent = "答案還不對，再看看兩個提示。";
    result.classList.add("error");
  }
});
document.getElementById("checkExitBtn").addEventListener("click",()=>{
  const street = document.getElementById("streetAnswer").value.trim().replace(/街$/,"");
  const exit = document.getElementById("exitAnswer").value.trim();
  const result = document.getElementById("exitResult");
  result.classList.remove("hidden","error");
  if(street==="酒泉" && exit==="1"){
    state.finalSolved = true; saveState();
    result.innerHTML = "🎊 任務完成！<br><strong>請立即前往圓山捷運站 1 號出口集合。</strong><br>不要把答案告訴其他組！";
  }else{
    result.textContent = "還沒有找到正確出口。請再查看捷運站地圖或出口資訊。";
    result.classList.add("error");
  }
});

document.getElementById("resetBtn").addEventListener("click",()=>{
  if(confirm("確定要清除本次所有任務進度與照片嗎？")){
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

init();
