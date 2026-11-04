// Build an opt-in five-quest, READ-ONLY student preview.
// Does not deploy any page or modify GitHub Pages source.
import {execFileSync} from "node:child_process";
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";

const root=resolve(".");
execFileSync(process.execPath,["scripts/build-cloud-quest-preview.mjs"],{cwd:root,stdio:"inherit"});
const dir=join(root,".firebase-preview");
let html=await readFile(join(dir,"cloud-quest.html"),"utf8");
const title="<title>台北島｜Firebase 小組同步預覽</title>";
if(!html.includes(title))throw Error("Five-quest build: unexpected source title");
html=html.replace(title,"<title>台北島｜五關學生預覽（唯讀）</title>");
const original="每人以自己的手機登入，輸入老師發放的專屬加入碼；此版只顯示共享進度，不接受正式任務提交。";
if(!html.includes(original))throw Error("Five-quest build: missing read-only notice");
html=html.replace(original,"五關皆可瀏覽、填寫本機草稿並查看小組同步進度；這是唯讀測試版，所有關卡均不可送出雲端成果。請勿上傳真實學生照片。");
const marker='<section id="dashboardScreen" class="screen">';
if(!html.includes(marker))throw Error("Five-quest build: dashboard section missing");
html=html.replace(marker,marker+'\n        <div class="panel" role="note" id="fiveQuestReadOnlyNotice"><strong>🧪 五關介面預覽｜禁止雲端提交</strong><p>完成印章只根據 Firestore 的小組成果顯示；所有五關都完成才解鎖最後謎題。本機練習不會建立完成紀錄。</p></div>');
// Use its own local draft key so it cannot reuse or overwrite existing
// pilot-quest / cloud-quest drafts from the same origin.
const jsPath=join(dir,"cloud-quest.js");
const originalJS=await readFile(jsPath,"utf8");
const sourceKey='const STORAGE_KEY = "taipeiCulturalQuestCloudPreviewV1";';
if(!originalJS.includes(sourceKey))throw Error("Five-quest build: expected local draft key missing");
let js=originalJS.replace(sourceKey,'const STORAGE_KEY = "taipeiCulturalQuestFiveReadOnlyV1";');
const oldScript='<script src="cloud-quest.js"></script>';
if(!html.includes(oldScript))throw Error("Five-quest build: missing client script");
html=html.replace(oldScript,'<script src="five-quest.js"></script>');
await writeFile(join(dir,"five-quest.html"),html);
await writeFile(join(dir,"five-quest.js"),js);
console.log("Five-quest read-only student preview generated at .firebase-preview/five-quest.html; NOT deployed.");
