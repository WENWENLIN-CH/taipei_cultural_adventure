// Builds a separate pilot2026 stage2 FORM REVIEW preview. This is intentionally
// read-only and does not activate a callable, Storage writes or other missions.
// All code is generated into .firebase-preview only; no deployment here.
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve(".");
const dir=join(root,".firebase-preview");
const read=name=>readFile(join(dir,name),"utf8");
const write=(name,src)=>writeFile(join(dir,name),src);
function once(src,from,to,label){
 const count=src.split(from).length-1;
 if(count!==1)throw Error("Stage2 preview build mismatch "+label+" ("+count+")");
 return src.replace(from,to);
}
let html=await read("pilot2026-cloud-quest.html");
html=once(html,"台北島｜pilot2026 雲端提交準備版",
 "台北島｜第二關異國文字解密・四張照片介面測試","title");
html=once(html,
 "獨立 pilot2026 測試活動：可登入、加入測試小組與查看雲端進度；提交按鈕暫時關閉。正式後端尚未核准開放，請勿使用真實學生照片。",
 "第二關介面測試：請查看四種語言與四張照片的填寫操作。本頁只儲存本機草稿並顯示既有的雲端進度，不會提交任何關卡。請勿使用可辨識學生的照片。","intro");
html=once(html,"🧪 pilot2026 獨立活動｜提交功能等待安全驗證",
 "🧪 第二關四張照片操作測試｜所有雲端提交均鎖定","note");
html=once(html,
 "只有 pilot2026 的 Firestore 真正完成紀錄才會顯示印章；目前提交按鈕鎖定，不能建立成果。",
 "可開啟「異國文字解密」測試語言欄位和選取照片，提交按鈕保持停用。第一關 1／5 印章仍從 Firestore 讀取；不會建立第二關成果。","note desc");
html=once(html,'<script src="pilot2026-cloud-quest.js"></script>',
 '<script src="pilot2026-stage2-review-quest.js"></script>',"client script");
html=once(html,'<script type="module" src="pilot2026-cloud-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage2-review-bootstrap.js"></script>',"bootstrap");
let js=await read("pilot2026-cloud-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026CloudV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage2ReviewV1";',"local draft isolation");
let boot=await read("pilot2026-cloud-bootstrap.js");
if(!boot.includes("const SUBMISSIONS_ENABLED=false;") ||
 !boot.includes("submitPilot2026Stage1") ||
 boot.includes("submitPilot2026Stage2"))
 throw Error("Unsafe source bootstrap for stage2 review");
boot=once(boot,"模式：待啟用，不接受雲端提交",
 "模式：第二關介面檢查，所有雲端提交停用","status");
await write("pilot2026-stage2-review.html",html);
await write("pilot2026-stage2-review-quest.js",js);
await write("pilot2026-stage2-review-bootstrap.js",boot);
console.log("BUILT pilot2026 Stage2 form review; read-only, no Storage writes, no Function deployment.");
