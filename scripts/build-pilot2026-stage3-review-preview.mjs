// Stage3 Halal mission UI review page. Build only; cloud submission stays DISABLED.
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),dir=join(root,".firebase-preview");
const read=n=>readFile(join(dir,n),"utf8"),write=(n,v)=>writeFile(join(dir,n),v);
function once(src,from,to,label){
 const count=src.split(from).length-1;
 if(count!==1)throw Error("Stage3 review build mismatch "+label+": "+count);
 return src.replace(from,to);
}
let html=await read("pilot2026-stage2-review.html");
html=once(html,"台北島｜第二關異國文字解密・四張照片介面測試",
 "台北島｜第三關 Halal 大搜查・介面測試","title");
html=once(html,"第二關介面測試：請查看四種語言與四張照片的填寫操作。本頁只儲存本機草稿並顯示既有的雲端進度，不會提交任何關卡。請勿使用可辨識學生的照片。",
 "第三關介面測試：填寫清真認證餐廳名稱，拍攝餐廳招牌及 Halal 標示兩張測試照片。僅儲存本機草稿、讀取雲端 2／5 進度；本頁不允許提交雲端成果。","intro");
html=once(html,"🧪 第二關四張照片操作測試｜所有雲端提交均鎖定",
 "🧪 第三關 Halal 大搜查｜所有雲端提交均鎖定","notice");
html=once(html,"可開啟「異國文字解密」測試語言欄位和選取照片，提交按鈕保持停用。第一關 1／5 印章仍從 Firestore 讀取；不會建立第二關成果。",
 "可開啟「Halal大搜查」檢查餐廳名稱、招牌與認證照片欄位。第一、二關進度仍由 Firestore 讀取；此頁不建立第三關成果。","description");
html=once(html,'<script src="pilot2026-stage2-review-quest.js"></script>',
 '<script src="pilot2026-stage3-review-quest.js"></script>',"quest script");
html=once(html,'<script type="module" src="pilot2026-stage2-review-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage3-review-bootstrap.js"></script>',"bootstrap");
let js=await read("pilot2026-stage2-review-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage2ReviewV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage3ReviewV1";',"local draft");
let boot=await read("pilot2026-stage2-review-bootstrap.js");
if(!boot.includes("const SUBMISSIONS_ENABLED=false;")||boot.includes("submitPilot2026Stage3"))
 throw Error("Unsafe Stage3 review inherited bootstrap");
boot=once(boot,"模式：第二關介面檢查，所有雲端提交停用",
 "模式：第三關介面檢查，所有雲端提交停用","status");
await write("pilot2026-stage3-review.html",html);
await write("pilot2026-stage3-review-quest.js",js);
await write("pilot2026-stage3-review-bootstrap.js",boot);
console.log("BUILT Stage3 Halal review page (2 photos; cloud submissions disabled). NOT DEPLOYED.");
