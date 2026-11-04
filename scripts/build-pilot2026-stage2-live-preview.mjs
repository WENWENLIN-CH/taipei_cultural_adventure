// Build-only candidate: isolated Stage2 LIVE page, no Firebase deployment.
// Never edit Stage1, QR landing, teacher dashboard, main site or existing rules.
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),dir=join(root,".firebase-preview");
const read=n=>readFile(join(dir,n),"utf8"),write=(n,v)=>writeFile(join(dir,n),v);
function once(source,old,next,label){
 const count=source.split(old).length-1;
 if(count!==1)throw Error("Stage2 live candidate mismatch "+label+"; found "+count);
 return source.replace(old,next);
}
let html=await read("pilot2026-stage2-review.html");
html=once(html,"台北島｜第二關異國文字解密・四張照片介面測試",
 "台北島｜第二關異國文字解密・雲端提交候選","title");
html=once(html,"第二關介面測試：請查看四種語言與四張照片的填寫操作。本頁只儲存本機草稿並顯示既有的雲端進度，不會提交任何關卡。請勿使用可辨識學生的照片。",
 "第二關限縮驗收候選：僅 pilot2026 第一組第二關，須填四種不同語言並上傳四張非個資 JPEG；一次提交後不可修改。尚未部署，請勿將此頁用於正式活動。","intro");
html=once(html,"🧪 第二關四張照片操作測試｜所有雲端提交均鎖定",
 "🧪 第二關第一組真實雲端提交｜部署前候選","notice");
html=once(html,"可開啟「異國文字解密」測試語言欄位和選取照片，提交按鈕保持停用。第一關 1／5 印章仍從 Firestore 讀取；不會建立第二關成果。",
 "僅第二關可提交四張測試 JPEG，第一關已完成成果不可覆寫，第三至第五關禁止提交。真正完成進度只由 Firestore 更新。","description");
html=once(html,'<script src="pilot2026-stage2-review-quest.js"></script>',
 '<script src="pilot2026-stage2-live-quest.js"></script>',"quest script");
html=once(html,'<script type="module" src="pilot2026-stage2-review-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage2-live-bootstrap.js"></script>',"bootstrap script");
let js=await read("pilot2026-stage2-review-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage2ReviewV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage2LiveV1";',"draft isolation");
js=once(js,'確認代表第一組提交第三關共同成果？提交後不可自行修改，並會上傳 2 張照片。',
 '確認提交第一組第二關的四種語言和 4 張測試照片嗎？成功後小組成果不可自行修改。',"confirm");
js=once(js,
 '  document.getElementById("completeMissionBtn").disabled = !window.cloudQuestMaySubmit?.(m.id);',
 '  document.getElementById("completeMissionBtn").dataset.missionId = String(m.id);\n  document.getElementById("completeMissionBtn").disabled = !window.cloudQuestMaySubmit?.(m.id);',
 "record visible mission for live permission refresh");
let boot=await read("pilot2026-stage2-review-bootstrap.js");
boot=once(boot,'import {submitPilot2026Stage1} from "./pilot2026-stage1-submission.js";',
 'import {submitPilot2026Stage2} from "./pilot2026-stage2-submission.js";',"callable");
boot=once(boot,'const SUBMISSIONS_ENABLED=false; // NEVER switch on before approved server rollout.',
 'const SUBMISSIONS_ENABLED=true; // Isolated build candidate ONLY; server and Storage must be separately approved.',"activation");
boot=once(boot,'const STAGE1_MISSION=1;','const STAGE1_MISSION=2;',"mission restriction");
boot=once(boot,'submitMission:submitPilot2026Stage1','submitMission:submitPilot2026Stage2',"submission");
// Firestore snapshots arrive asynchronously. An already-open mission button
// must be re-evaluated when readiness changes, without rebuilding form inputs.
boot=once(boot,
 'function render(){',
 `function refreshStage2Button(){\n const btn=document.getElementById("completeMissionBtn");\n if(!btn || !document.getElementById("missionScreen")?.classList.contains("active"))return;\n const id=Number(btn.dataset.missionId);\n if(!Number.isInteger(id))return;\n const eligible=window.cloudQuestMaySubmit(id);\n btn.disabled=!eligible;\n btn.textContent=window.cloudQuestCompleted(id)?"✓ 已完成此任務":eligible?"提交小組共同成果":"提交小組共同成果（尚未開放）";\n}\nfunction render(){`,
 "reactive mission button refresh helper");
boot=once(boot,
 ' joinButton.disabled=Boolean(group);',
 ' joinButton.disabled=Boolean(group);\n refreshStage2Button();',
 "refresh on Firestore snapshots");
boot=once(boot,'模式：第二關介面檢查，所有雲端提交停用',
 '模式：僅 group01 第二關開放提交候選',"status");
boot=once(boot,'｜提交未開放',
 '｜僅第一組第二關測試提交候選',"dashboard");
boot=once(boot,'加入試辦小組成功。五關雲端提交目前仍關閉。',
 '加入試辦小組成功。只有第一組第二關可以提交四張測試照片。',"join notice");
boot=once(boot,'pilot2026 尚未開放雲端提交，請勿使用真實照片',
 '只允許第一組第二關的測試照片，其他關卡禁止提交',"error");
if(!boot.includes('group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION') ||
 !boot.includes('readyCount===5') || boot.includes('submitPilot2026Stage1'))
 throw Error("Unsafe Stage2 gate or callable");
await write("pilot2026-stage2-live-quest.html",html);
await write("pilot2026-stage2-live-quest.js",js);
await write("pilot2026-stage2-live-bootstrap.js",boot);
await copyFile(join(root,"pilot2026-stage2-submission.js"),join(dir,"pilot2026-stage2-submission.js"));
console.log("BUILT isolated Stage2 live candidate: pilot2026/group01/mission2 ONLY. NOT DEPLOYED.");
