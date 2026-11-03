// Build an isolated cloud quest preview without editing the original website.
import {readFile,writeFile,copyFile,mkdir} from "node:fs/promises";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=join(root,".firebase-preview");
await mkdir(output,{recursive:true});
let html=await readFile(join(root,"index.html"),"utf8");
let js=await readFile(join(root,"script.js"),"utf8");
function once(src,needle,replacement,label){
 if(!src.includes(needle))throw Error("Cloud quest build: missing "+label);
 return src.replace(needle,replacement);
}
html=once(html,'<title>臺北異文化城市大冒險</title>','<title>台北島｜Firebase 小組同步預覽</title>',"page title");
html=once(html,'<div class="panel">\n          <label>組別名稱','<div class="panel" hidden aria-hidden="true">\n          <label>組別名稱',"old local group form");
html=once(html,'<section id="startScreen" class="screen active">','<section id="startScreen" class="screen active">\n        <div class="panel"><h2>Firebase 小組加入｜開發預覽</h2><p>每人以自己的手機登入，輸入老師發放的專屬加入碼；此版只顯示共享進度，不接受正式任務提交。</p><button id="cloudLogin" class="primary-btn" type="button">學生匿名登入</button><label>專屬加入碼<input id="cloudInvite" type="text" inputmode="text" autocomplete="off" placeholder="48 位加入碼"></label><button id="cloudJoin" class="primary-btn" type="button">加入小組</button><pre id="cloudFeedback" role="status" style="white-space:pre-wrap"></pre><pre id="cloudStatus" role="status" style="white-space:pre-wrap"></pre></div>',"cloud join panel");
html=once(html,'<script src="script.js"></script>','<script src="cloud-quest.js"></script>\n  <script type="module" src="cloud-quest-bootstrap.js"></script>',"scripts");
html=once(html,'<div class="quest-status">','<div id="cloudDashboardStatus" class="panel" role="status">Firebase 同步連線中…</div>\n        <div class="quest-status">', "dashboard cloud status");
html=once(html,'<div id="finalLockCard" class="teacher-strip locked">','<div id="finalLockCard" class="teacher-strip locked" style="display:none">',"local teacher override");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestV1";','const STORAGE_KEY = "taipeiCulturalQuestCloudPreviewV1";',"storage key");
js=once(js,'return missions.filter(m=>state.missions?.[m.id]?.completed).length;','return missions.filter(m=>window.cloudQuestCompleted?.(m.id)).length;',"done count");
js=once(js,'return doneCount()===5 || state.teacherUnlocked;','return doneCount()===5;',"final unlock");
js=js.replaceAll('const done = !!state.missions?.[m.id]?.completed;','const done = Boolean(window.cloudQuestCompleted?.(m.id));');
js=once(js,'const done = !!state.missions?.[id]?.completed;','const done = Boolean(window.cloudQuestCompleted?.(id));',"island pin cloud state");
js=once(js,'${ms.completed?"✓ 已完成此任務":"完成任務"}','${window.cloudQuestCompleted?.(m.id)?"✓ 已完成此任務":"提交小組共同成果（尚未開放）"}',"mission button label");
js=once(js,'    ms.completed = true;\n    saveState();\n    alert("MISSION CLEAR！🎉\\n文化印章已收入護照。");\n    showDashboard();','    try {\n      await window.cloudQuestSubmit(m.id, ms.data);\n      alert("伺服器已接收成果，請等待共享進度更新。");\n      showDashboard();\n    } catch(err) { alert("尚未完成任務："+err.message); }',"server authority");
js=once(js,'  showScreen("missionScreen");','  document.getElementById("completeMissionBtn").disabled = true;\n  showScreen("missionScreen");',"disable submissions");
js=once(js,'init();','// Preserve local answer drafts but never trust cached local completions.\nstate.started = false;\nstate.teacherUnlocked = false;\nwindow.cloudQuestActivate = function(g){\n  state.started=true;state.teamName=g.groupId;state.members="";\n  state.teacherUnlocked=false;showDashboard();\n};\ninit();',"boot activation");
html=once(html,'<button id="resetBtn" class="danger-link">重新開始本次任務</button>','<button id="resetBtn" class="danger-link">清除本機草稿（不影響小組雲端進度）</button>',"reset button label");
js=once(js,'確定要清除本次所有任務進度與照片嗎？','確定清除這台手機的任務草稿與本機照片嗎？小組雲端進度不受影響。', "reset confirmation");
await writeFile(join(output,"cloud-quest.html"),html);
await writeFile(join(output,"cloud-quest.js"),js);
for(const file of ["style.css","cloud-quest-bootstrap.js","firebase-auth.js","firebase-config.js","group-service.js","mission-cloud-flow.js","mission-form-adapter.js","photo-upload.js","mission-submission.js","mission-schema.js"]){
  await copyFile(join(root,file),join(output,file));
}
console.log("Built isolated cloud-quest.html preview: shared Firestore progress, submissions disabled. Original index.html unchanged.");
