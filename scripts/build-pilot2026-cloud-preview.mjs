// Generate a separate Firebase-connected pilot2026 student page.
// Safe default: submit buttons remain disabled until approved full rollout.
// This script never deploys to Firebase.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve(".");
execFileSync(process.execPath,["scripts/build-five-quest-preview.mjs"],{cwd:root,stdio:"inherit"});
const dir=join(root,".firebase-preview");
let html=await readFile(join(dir,"five-quest.html"),"utf8");
let js=await readFile(join(dir,"five-quest.js"),"utf8");
function once(source,old,news,label){
 if(!source.includes(old))throw Error("pilot2026 build mismatch: "+label);
 return source.replace(old,news);
}
html=once(html,"台北島｜五關學生預覽（唯讀）","台北島｜pilot2026 雲端提交準備版","title");
html=once(html,
 "五關皆可瀏覽、填寫本機草稿並查看小組同步進度；這是唯讀測試版，所有關卡均不可送出雲端成果。請勿上傳真實學生照片。",
 "獨立 pilot2026 測試活動：可登入、加入測試小組與查看雲端進度；提交按鈕暫時關閉。正式後端尚未核准開放，請勿使用真實學生照片。","intro");
html=once(html,"🧪 五關介面預覽｜禁止雲端提交",
 "🧪 pilot2026 獨立活動｜提交功能等待安全驗證","note");
html=once(html,"完成印章只根據 Firestore 的小組成果顯示；所有五關都完成才解鎖最後謎題。本機練習不會建立完成紀錄。",
 "只有 pilot2026 的 Firestore 真正完成紀錄才會顯示印章；目前提交按鈕鎖定，不能建立成果。","note desc");
html=once(html,'<script src="five-quest.js"></script>',
 '<script src="pilot2026-cloud-quest.js"></script>',"client");
html=once(html,'<script type="module" src="cloud-quest-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-cloud-bootstrap.js"></script>',"bootstrap");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestFiveReadOnlyV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026CloudV1";',"storage key");
await writeFile(join(dir,"pilot2026-cloud-quest.html"),html);
await writeFile(join(dir,"pilot2026-cloud-quest.js"),js);
await copyFile(join(root,"pilot2026-cloud-bootstrap.js"),join(dir,"pilot2026-cloud-bootstrap.js"));
console.log("Built pilot2026-cloud-quest.html: Firebase-connected isolated student page, submissions DISABLED. NOT DEPLOYED.");
