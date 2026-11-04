// Stage4 read-only world restaurant review, built alongside existing 3/5 preview.
// Builder touches only .firebase-preview and never deploys.
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const dir=join(resolve("."),".firebase-preview");
const read=n=>readFile(join(dir,n),"utf8"),write=(n,v)=>writeFile(join(dir,n),v);
function once(src,old,next,label){
 const count=src.split(old).length-1;
 if(count!==1)throw Error("Stage4 review source mismatch "+label+" ("+count+")");
 return src.replace(old,next);
}
let html=await read("pilot2026-stage3-review.html");
html=once(html,"台北島｜第三關 Halal 大搜查・介面測試","台北島｜第四關 環遊世界美食家・介面測試","title");
html=once(html,
 "第三關介面測試：填寫清真認證餐廳名稱，拍攝餐廳招牌及 Halal 標示兩張測試照片。僅儲存本機草稿、讀取雲端 2／5 進度；本頁不允許提交雲端成果。",
 "第四關介面測試：從五大洲選出三個不同洲，各填寫國家、餐廳名稱並選取一張測試照片。此頁只儲存本機草稿並讀取雲端已完成 3／5；不會提交雲端成果。","intro");
html=once(html,"🧪 第三關 Halal 大搜查｜所有雲端提交均鎖定",
 "🧪 第四關 環遊世界美食家｜所有雲端提交均鎖定","notice");
html=once(html,
 "可開啟「Halal大搜查」檢查餐廳名稱、招牌與認證照片欄位。第一、二關進度仍由 Firestore 讀取；此頁不建立第三關成果。",
 "可開啟「環遊世界美食家」測試三組洲別、國家、餐廳名稱與三張照片；前三關進度由 Firestore 讀取，本頁不建立第四關成果。","description");
html=once(html,'<script src="pilot2026-stage3-review-quest.js"></script>',
 '<script src="pilot2026-stage4-review-quest.js"></script>',"quest");
html=once(html,'<script type="module" src="pilot2026-stage3-review-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage4-review-bootstrap.js"></script>',"bootstrap");
let js=await read("pilot2026-stage3-review-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage3ReviewV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage4ReviewV1";',"draft");
let boot=await read("pilot2026-stage3-review-bootstrap.js");
if(!boot.includes("const SUBMISSIONS_ENABLED=false;")||
 boot.includes("submitPilot2026Stage4")||
 !boot.includes("watchGroupMissions(g,"))
 throw Error("Unsafe Stage4 review: submissions must remain disabled");
boot=once(boot,"模式：第三關介面檢查，所有雲端提交停用",
 "模式：第四關介面檢查，所有雲端提交停用","status");
await write("pilot2026-stage4-review.html",html);
await write("pilot2026-stage4-review-quest.js",js);
await write("pilot2026-stage4-review-bootstrap.js",boot);
console.log("BUILT Stage4 three-continent form review; cloud submissions DISABLED. NOT DEPLOYED.");
