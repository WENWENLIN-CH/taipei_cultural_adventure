// Isolated Stage4 and Stage5 live candidates, build-only. No Firebase deployment.
// Reuses Stage3's proven Firestore readiness/button refresh behavior and Stage4/5 reviewed forms.
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=resolve("."),dir=join(root,".firebase-preview");
const read=n=>readFile(join(dir,n),"utf8");
const write=(n,s)=>writeFile(join(dir,n),s);
function once(src,from,to,label){
 const n=src.split(from).length-1;
 if(n!==1)throw Error("Stage4/5 live candidate mismatch "+label+": "+n);
 return src.replace(from,to);
}
const specs=[
 {n:4,title:"環遊世界美食家",description:"三個不同洲的餐廳、國家與三張測試 JPEG",originalIntro:"第四關介面測試：從五大洲選出三個不同洲，各填寫國家、餐廳名稱並選取一張測試照片。此頁只儲存本機草稿並讀取雲端已完成 3／5；不會提交雲端成果。",originalDesc:"可開啟「環遊世界美食家」測試三組洲別、國家、餐廳名稱與三張照片；前三關進度由 Firestore 讀取，本頁不建立第四關成果。",confirm:"確認提交第一組第四關的三個不同洲餐廳資料及 3 張測試照片嗎？成功後小組成果不可自行修改。",requiredPrevious:3},
 {n:5,title:"揭秘南洋商店",description:"三個不同國家的食品、商品名稱與三張測試 JPEG",originalIntro:"第五關介面測試：找出三個不同國家的零食或食品，填寫來源國家、商品名稱並拍攝三張測試照片。只保存在本機草稿、讀取 Firestore 已完成進度，不會提交第五關。",originalDesc:"可開啟「揭秘南洋商店」測試三組來源國家、商品名稱及三張照片；共同進度仍由 Firestore 讀取，且本頁不會建立第五關成果。",confirm:"確認提交第一組第五關的三個不同國家商品及 3 張測試照片嗎？成功後小組成果不可自行修改。",requiredPrevious:4}
];
for(const spec of specs){
 const {n,title,description,originalIntro,originalDesc,confirm,requiredPrevious}=spec;
 let html=await read(`pilot2026-stage${n}-review.html`);
 html=once(html,`台北島｜第${n===4?"四":"五"}關 ${title}・介面測試`,
  `台北島｜第${n===4?"四":"五"}關 ${title}・雲端提交候選`,"title");
 html=once(html,originalIntro,
  `第${n===4?"四":"五"}關受控提交候選：僅 pilot2026/group01/mission${n}，請完成${description}。此候選頁須待後端及 Storage 審核後才可發布。`,"intro");
 html=once(html,`🧪 第${n===4?"四":"五"}關 ${title}｜所有雲端提交均鎖定`,
  `🧪 第${n===4?"四":"五"}關 ${title}｜限 group01 提交候選`,"notice");
 html=once(html,originalDesc,
  `僅第${n===4?"四":"五"}關可送出三張測試 JPEG，其他關卡不得從本頁提交。第一至第三關不得覆寫，真正進度以 Firestore 為準。`,"description");
 html=once(html,`<script src="pilot2026-stage${n}-review-quest.js"></script>`,
  `<script src="pilot2026-stage${n}-live-quest.js"></script>`,"quest script");
 html=once(html,`<script type="module" src="pilot2026-stage${n}-review-bootstrap.js"></script>`,
  `<script type="module" src="pilot2026-stage${n}-live-bootstrap.js"></script>`,"bootstrap script");
 let js=await read("pilot2026-stage3-live-quest.js");
 js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage3LiveV1";',
  `const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage${n}LiveV1";`,"draft isolation");
 js=once(js,"確認提交第一組第三關的餐廳名稱及 2 張測試照片嗎？成功後小組成果不可自行修改。",
  confirm,"confirmation");
 let boot=await read("pilot2026-stage3-live-bootstrap.js");
 boot=once(boot,'import {submitPilot2026Stage3} from "./pilot2026-stage3-submission.js";',
  `import {submitPilot2026Stage${n}} from "./pilot2026-stage${n}-submission.js";`,"callable import");
 boot=once(boot,"const STAGE1_MISSION=3;",`const STAGE1_MISSION=${n};`,"mission gate");
 boot=once(boot,"submitMission:submitPilot2026Stage3",`submitMission:submitPilot2026Stage${n}`,"callable");
 boot=once(boot,"function refreshStage3Button(){",`function refreshStage${n}Button(){`,"button updater");
 boot=once(boot," refreshStage3Button();",` refreshStage${n}Button();`,"snapshot update");
 boot=once(boot,"模式：僅 group01 第三關開放提交候選",`模式：僅 group01 第${n===4?"四":"五"}關開放提交候選`,"status");
 boot=once(boot,"｜僅第一組第三關測試提交候選",`｜僅第一組第${n===4?"四":"五"}關測試提交候選`,"dashboard");
 boot=once(boot,"加入試辦小組成功。只有第一組第三關可以提交兩張測試照片。",
  `加入試辦小組成功。僅第一組第${n===4?"四":"五"}關可以提交三張測試照片。`,"join message");
 boot=once(boot,"只允許第一組第三關的測試照片，其他關卡禁止提交",
  `只允許第一組第${n===4?"四":"五"}關的測試照片，其他關卡禁止提交`,"error");
 // Client-side sequence gate: 5th mission waits for verified 4th mission. Server keeps independent scopes.
 const oldGate='!completed.has(Number(id)) && !submitting && readyCount===5';
 boot=once(boot,oldGate,
  `!completed.has(Number(id)) && completed.has(${requiredPrevious}) && !submitting && readyCount===5`,"prior completed gate");
 if(!boot.includes("const SUBMISSIONS_ENABLED=true;") ||
  !boot.includes('const STAGE1_GROUP="group01";') ||
  !boot.includes(`const STAGE1_MISSION=${n};`) ||
  !boot.includes("readyCount===5") ||
  !boot.includes(`completed.has(${requiredPrevious})`) ||
  !boot.includes(`refreshStage${n}Button();`) ||
  !boot.includes(`submitMission:submitPilot2026Stage${n}`) ||
  boot.includes("submitPilot2026Stage3") ||
  !js.includes("dataset.missionId = String(m.id)"))
  throw Error("Unsafe isolated Stage"+n+" live gate / callable / refresh");
 await write(`pilot2026-stage${n}-live-quest.html`,html);
 await write(`pilot2026-stage${n}-live-quest.js`,js);
 await write(`pilot2026-stage${n}-live-bootstrap.js`,boot);
 await copyFile(join(root,`pilot2026-stage${n}-submission.js`),
  join(dir,`pilot2026-stage${n}-submission.js`));
 console.log(`BUILT Stage${n} independent live candidate; NOT DEPLOYED.`);
}
