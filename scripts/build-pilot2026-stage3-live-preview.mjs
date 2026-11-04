// Build-only isolated Stage3 live candidate; never deploys anything.
// Reuse proven Stage2 live button/reactive cloud logic and verified Stage3 read-only UI.
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve("."),dir=join(root,".firebase-preview");
const read=p=>readFile(join(dir,p),"utf8"),write=(p,body)=>writeFile(join(dir,p),body);
function once(src,old,next,what){
 const count=src.split(old).length-1;
 if(count!==1)throw Error("Stage3 live candidate mismatch "+what+" ("+count+")");
 return src.replace(old,next);
}
let html=await read("pilot2026-stage3-review.html");
html=once(html,"台北島｜第三關 Halal 大搜查・介面測試",
 "台北島｜第三關 Halal 大搜查・受控雲端提交候選","title");
html=once(html,
 "第三關介面測試：填寫清真認證餐廳名稱，拍攝餐廳招牌及 Halal 標示兩張測試照片。僅儲存本機草稿、讀取雲端 2／5 進度；本頁不允許提交雲端成果。",
 "第三關受控雲端提交候選：僅 pilot2026 第一組第三關。輸入餐廳名稱、上傳招牌及 Halal 標示兩張非個資 JPEG 照片。通過安全審核部署前請勿使用。","intro");
html=once(html,"🧪 第三關 Halal 大搜查｜所有雲端提交均鎖定",
 "🧪 第三關 Halal 大搜查｜限 group01 受控提交候選","notice");
html=once(html,
 "可開啟「Halal大搜查」檢查餐廳名稱、招牌與認證照片欄位。第一、二關進度仍由 Firestore 讀取；此頁不建立第三關成果。",
 "第三關可提交餐廳名稱與兩張非個資 JPEG 測試照片；第一、二關共同成果不可覆寫，第四、五關禁止提交。真正進度只由 Firestore 更新。","description");
html=once(html,'<script src="pilot2026-stage3-review-quest.js"></script>',
 '<script src="pilot2026-stage3-live-quest.js"></script>',"quest script");
html=once(html,'<script type="module" src="pilot2026-stage3-review-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-stage3-live-bootstrap.js"></script>',"bootstrap script");
let js=await read("pilot2026-stage2-live-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage2LiveV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage3LiveV1";',"draft isolation");
js=once(js,'確認提交第一組第二關的四種語言和 4 張測試照片嗎？成功後小組成果不可自行修改。',
 '確認提交第一組第三關的餐廳名稱及 2 張測試照片嗎？成功後小組成果不可自行修改。',"confirm");
let boot=await read("pilot2026-stage2-live-bootstrap.js");
boot=once(boot,'import {submitPilot2026Stage2} from "./pilot2026-stage2-submission.js";',
 'import {submitPilot2026Stage3} from "./pilot2026-stage3-submission.js";',"callable import");
boot=once(boot,"const STAGE1_MISSION=2;","const STAGE1_MISSION=3;","mission gate");
boot=once(boot,'submitMission:submitPilot2026Stage2',
 'submitMission:submitPilot2026Stage3',"callable invocation");
boot=once(boot,"function refreshStage2Button(){",
 "function refreshStage3Button(){","button updater");
boot=once(boot," refreshStage2Button();"," refreshStage3Button();","snapshot refresh");
boot=once(boot,"模式：僅 group01 第二關開放提交候選",
 "模式：僅 group01 第三關開放提交候選","status");
boot=once(boot,"｜僅第一組第二關測試提交候選",
 "｜僅第一組第三關測試提交候選","dashboard");
boot=once(boot,"加入試辦小組成功。只有第一組第二關可以提交四張測試照片。",
 "加入試辦小組成功。只有第一組第三關可以提交兩張測試照片。","join feedback");
boot=once(boot,"只允許第一組第二關的測試照片，其他關卡禁止提交",
 "只允許第一組第三關的測試照片，其他關卡禁止提交","error");
if(!boot.includes("const SUBMISSIONS_ENABLED=true;")||
 !boot.includes('const STAGE1_GROUP="group01";')||
 !boot.includes('const STAGE1_MISSION=3;')||
 !boot.includes("readyCount===5")||
 !boot.includes("group.groupId===STAGE1_GROUP && Number(id)===STAGE1_MISSION")||
 !boot.includes("!completed.has(Number(id))")||
 !boot.includes("refreshStage3Button();")||
 !boot.includes("submitMission:submitPilot2026Stage3")||
 boot.includes("submitPilot2026Stage2")||
 !js.includes("dataset.missionId = String(m.id)"))
 throw Error("Unsafe Stage3 live gate / reactive refresh / submission client");
await write("pilot2026-stage3-live-quest.html",html);
await write("pilot2026-stage3-live-quest.js",js);
await write("pilot2026-stage3-live-bootstrap.js",boot);
await copyFile(join(root,"pilot2026-stage3-submission.js"),join(dir,"pilot2026-stage3-submission.js"));
console.log("BUILT Stage3 independent live candidate (pilot2026/group01/mission3 only), NOT DEPLOYED.");
