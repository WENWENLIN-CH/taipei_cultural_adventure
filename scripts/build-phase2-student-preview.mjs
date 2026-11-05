// Build-only student preview, isolated from GitHub Pages and pilot2026.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),dir=join(root,".firebase-preview");
execFileSync(process.execPath,["scripts/build-five-quest-preview.mjs"],{cwd:root,stdio:"inherit"});
let html=await readFile(join(dir,"five-quest.html"),"utf8");
let js=await readFile(join(dir,"five-quest.js"),"utf8");
function once(src,from,to,label){
 const count=src.split(from).length-1;
 if(count!==1)throw Error("Phase2 preview mismatch "+label+" ("+count+")");
 return src.replace(from,to);
}
html=once(html,"台北島｜五關學生預覽（唯讀）","台北島｜第二階段三組活動候選","title");
html=once(html,"五關皆可瀏覽、填寫本機草稿並查看小組同步進度；這是唯讀測試版，所有關卡均不可送出雲端成果。請勿上傳真實學生照片。",
 "三組學生共用五關進度，提交完成後自動過關。開放前須完成 Firebase 權限與活動資料驗收。","introduction");
html=once(html,"🧪 五關介面預覽｜禁止雲端提交",
 "🏝️ 台北島｜第二階段活動","notice");
html=once(html,"完成印章只根據 Firestore 的小組成果顯示；所有五關都完成才解鎖最後謎題。本機練習不會建立完成紀錄。",
 "每組每關只送一份共同成果，進度依 Firestore 更新；五關完成自動解鎖圓山／酒泉街謎題。","description");
html=once(html,'<script src="five-quest.js"></script>','<script src="phase2-student-quest.js"></script>',"quest client");
html=once(html,'<script type="module" src="cloud-quest-bootstrap.js"></script>','<script type="module" src="phase2-student-bootstrap.js"></script>',"student bootstrap");
html=once(html,"Firebase 小組加入｜開發預覽","台北島｜掃描組別 QR Code 加入活動","join heading");

// Remove every legacy manual enrollment control from the Phase2 student page.
// QR fragment + Firebase anonymous sign-in are handled automatically by the bootstrap.
html=once(html,
 '<button id="cloudLogin" class="primary-btn" type="button">學生匿名登入</button><label>專屬加入碼<input id="cloudInvite" type="text" inputmode="text" autocomplete="off" placeholder="48 位加入碼"></label><button id="cloudJoin" class="primary-btn" type="button">加入小組</button>',
 '<p id="phase2JoinInstruction">請使用老師發給你的小組 QR Code 進入活動；不必輸入帳號、密碼或加入碼。</p>',
 "legacy manual enrollment controls");
html=once(html,
 "三組學生共用五關進度，提交完成後自動過關。開放前須完成 Firebase 權限與活動資料驗收。",
 "本頁目前為開放前測試版，尚不接受加入或提交。活動開放後，掃描老師提供的小組 QR Code 即可自動加入。",
 "locked release description");

js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestFiveReadOnlyV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPhase2CandidateV1";',"draft key");
js=once(js,"確認代表第一組提交第三關共同成果？提交後不可自行修改，並會上傳 2 張照片。",
 "確定提交本組這一關的共同成果嗎？成功後同組成員都會看到完成狀態，無法自行修改。","confirmation");
await writeFile(join(dir,"phase2-student-quest.html"),html);
await writeFile(join(dir,"phase2-student-quest.js"),js);
for(const file of ["phase2-student-bootstrap.js","phase2-submission.js","phase2-event-config.js","phase2-qr-link.js","group-service.js"])
 await copyFile(join(root,file),join(dir,file));
if(!html.includes('src="phase2-student-bootstrap.js"')||
 !js.includes("taipeiCulturalQuestPhase2CandidateV1")||
 !(await readFile(join(dir,"phase2-event-config.js"),"utf8")).includes("enabled:false"))
 throw Error("Phase2 preview unsafe activation");
console.log("BUILT: Phase2 five-quest student candidate. SUBMISSIONS DISABLED; NOT DEPLOYED.");
