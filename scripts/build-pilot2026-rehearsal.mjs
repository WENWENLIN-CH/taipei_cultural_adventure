// Local-only pilot2026 mobile form rehearsal. Never deploys and never calls Firebase.
import {execFileSync} from "node:child_process";
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve(".");
execFileSync(process.execPath,["scripts/build-five-quest-preview.mjs"],{cwd:root,stdio:"inherit"});
const out=join(root,".firebase-preview");
let html=await readFile(join(out,"five-quest.html"),"utf8");
let js=await readFile(join(out,"five-quest.js"),"utf8");
function replaceOnce(text,before,after){
 if(!text.includes(before))throw Error("Missing rehearsal build guard: "+before.slice(0,80));
 return text.replace(before,after);
}
html=replaceOnce(html,"台北島｜五關學生預覽（唯讀）","台北島｜pilot2026 五關提交操作演練");
html=replaceOnce(html,'<script src="five-quest.js"></script>','<script src="pilot2026-rehearsal.js"></script>');
html=replaceOnce(html,'<script type="module" src="cloud-quest-bootstrap.js"></script>',
'<script type="module" src="pilot2026-rehearsal-bootstrap.js"></script>');
html=replaceOnce(html,"五關皆可瀏覽、填寫本機草稿並查看小組同步進度；這是唯讀測試版，所有關卡均不可送出雲端成果。請勿上傳真實學生照片。",
"這是 pilot2026 的本機操作演練：五關都可填寫及按下提交檢查，但不連 Firebase、不寫入雲端、不產生過關印章。請只使用測試照片，勿使用學生個資。");
html=replaceOnce(html,"🧪 五關介面預覽｜禁止雲端提交",
"🧪 五關提交操作演練｜不會上傳雲端");
html=replaceOnce(html,"完成印章只根據 Firestore 的小組成果顯示；所有五關都完成才解鎖最後謎題。本機練習不會建立完成紀錄。",
"提交僅在本機檢查文字與照片欄位；沒有 Firebase 登入、沒有雲端進度，最後謎題永遠保持鎖定。");
js=replaceOnce(js,'const STORAGE_KEY = "taipeiCulturalQuestFiveReadOnlyV1";',
'const STORAGE_KEY = "taipeiCulturalQuestPilotRehearsalV1";');
js=replaceOnce(js,"確認代表第一組提交第三關共同成果？提交後不可自行修改，並會上傳 2 張照片。",
"這只是本機表單檢查演練：沒有任何雲端上傳，也不會標記完成。要繼續嗎？");
js=replaceOnce(js,"伺服器已接收成果，請等待小組同步更新。",
"本機檢查成功！這是演練，不會產生關卡完成紀錄。");
js=replaceOnce(js,"照片上傳與成果驗證中…","正在檢查本機欄位（不會上傳）…");
js=replaceOnce(js,"無法確認提交成功。請先檢查小組進度再重試。原因：",
"本機表單檢查沒有通過。原因：");
await writeFile(join(out,"pilot2026-rehearsal.html"),html);
await writeFile(join(out,"pilot2026-rehearsal.js"),js);
await copyFile(join(root,"pilot2026-rehearsal-bootstrap.js"),join(out,"pilot2026-rehearsal-bootstrap.js"));
console.log("BUILT pilot2026-rehearsal.html: local form validation ONLY. NO Firebase imports in rehearsal bootstrap. NOT deployed.");
