// Separate, opt-in pilot2026 stage-1 ONLY live-test page.
// Existing pilot2026-cloud-quest.html remains read-only; no other quests are enabled.
// BUILD ONLY: preview deployment requires an explicit user action.
import {readFile,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
const dir=join(resolve("."),".firebase-preview");
const read=name=>readFile(join(dir,name),"utf8");
const write=(name,source)=>writeFile(join(dir,name),source);
function once(src,from,to,label){
 const count=src.split(from).length-1;
 if(count!==1)throw Error("Stage1 build mismatch ("+label+"): expected 1, saw "+count);
 return src.replace(from,to);
}
let html=await read("pilot2026-cloud-quest.html");
html=once(html,"台北島｜pilot2026 雲端提交準備版","台北島｜pilot2026 第一組第一關雲端驗收","title");
html=once(html,
 "獨立 pilot2026 測試活動：可登入、加入測試小組與查看雲端進度；提交按鈕暫時關閉。正式後端尚未核准開放，請勿使用真實學生照片。",
 "限定測試：僅 pilot2026 第一組第一關可提交，請只用非個資的測試照片。上傳成功即建立無法自行覆寫的共同成果；其他四關維持唯讀。","intro");
html=once(html,"🧪 pilot2026 獨立活動｜提交功能等待安全驗證",
 "🧪 pilot2026 第一組第一關｜真實雲端提交測試","note");
html=once(html,
 "只有 pilot2026 的 Firestore 真正完成紀錄才會顯示印章；目前提交按鈕鎖定，不能建立成果。",
 "僅第一組的第一關開放一次性提交：填寫發現地點並上傳一張非個資 JPEG。印章只依 Firestore 的共同成果顯示；其餘關卡鎖定。","note desc");
html=once(html,'<script src="pilot2026-cloud-quest.js"></script>',
 '<script src="pilot2026-stage1-live-quest.js"></script>',"client");
html=once(html,'<script type="module" src="pilot2026-cloud-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage1-live-bootstrap.js"></script>',"bootstrap");
let js=await read("pilot2026-cloud-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026CloudV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage1LiveV1";',"draft storage");
js=once(js,'確認代表第一組提交第三關共同成果？提交後不可自行修改，並會上傳 2 張照片。',
 '確認要提交 pilot2026 第一組第一關共同成果嗎？將上傳 1 張測試照片；提交後不可自行修改。',"confirm");
let boot=await read("pilot2026-cloud-bootstrap.js");
boot=once(boot,"const SUBMISSIONS_ENABLED=false; // NEVER switch on before approved server rollout.",
 "const SUBMISSIONS_ENABLED=true; // Dedicated stage1 live-test page only. Server + Storage strictly scoped.","enable ONLY isolated page");
boot=once(boot,"模式：待啟用，不接受雲端提交",
 "模式：僅第一組第一關允許測試提交","student status");
boot=once(boot,"｜提交未開放",
 "｜第一組第一關試辦提交已開放","dashboard status");
boot=once(boot,"加入試辦小組成功。五關雲端提交目前仍關閉。",
 "加入試辦小組成功。只有第一組第一關可提交測試照片。","join notice");
boot=once(boot,"pilot2026 尚未開放雲端提交，請勿使用真實照片",
 "只開放 pilot2026 第一組第一關，請勿上傳真實學生照片","denied notice");
await write("pilot2026-stage1-live-quest.html",html);
await write("pilot2026-stage1-live-quest.js",js);
await write("pilot2026-stage1-live-bootstrap.js",boot);
console.log("BUILT stage1 live test page: pilot2026/group01/mission1 ONLY. Other pages unchanged. NOT DEPLOYED.");
