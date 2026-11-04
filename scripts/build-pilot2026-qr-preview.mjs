// Build a separate QR-scanning page from the already verified stage1 test
// page; retain group01/mission1 server restrictions and existing read-only page.
// BUILD ONLY, NO DEPLOYMENT, NO CREDENTIALS EMBEDDED IN OUTPUT.
import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve,join} from "node:path";
const dir=join(resolve("."),".firebase-preview");
const read=file=>readFile(join(dir,file),"utf8");
const write=(file,data)=>writeFile(join(dir,file),data);
function once(src,old,next,label){
 const count=src.split(old).length-1;
 if(count!==1)throw Error("QR build mismatch "+label+": "+count);
 return src.replace(old,next);
}
let html=await read("pilot2026-stage1-live-quest.html");
html=once(html,"台北島｜pilot2026 第一組第一關雲端驗收","台北島｜pilot2026 掃碼加入測試","title");
html=once(html,"限定測試：僅 pilot2026 第一組第一關可提交，請只用非個資的測試照片。上傳成功即建立無法自行覆寫的共同成果；其他四關維持唯讀。",
 "學生使用老師私下提供的專屬 QR Code 首次加入小組；同一支手機之後可直接恢復進度。僅 pilot2026 第一組第一關允許測試提交，請勿上傳學生個資。","intro");
html=once(html,'<script src="pilot2026-stage1-live-quest.js"></script>',
 '<script src="pilot2026-qr-join-quest.js"></script>',"client");
html=once(html,'<script type="module" src="pilot2026-stage1-live-bootstrap.js"></script>',
 '<script type="module" src="pilot2026-qr-join-bootstrap.js"></script>',"bootstrap");
let js=await read("pilot2026-stage1-live-quest.js");
js=once(js,'const STORAGE_KEY = "taipeiCulturalQuestPilot2026Stage1LiveV1";',
 'const STORAGE_KEY = "taipeiCulturalQuestPilot2026QrJoinV1";',"draft cache");
let boot=await read("pilot2026-stage1-live-bootstrap.js");
boot=once(boot,'import {watchAuth,studentSignIn} from "./firebase-auth.js";',
 'import {watchAuth,studentSignIn} from "./firebase-auth.js";\nimport {readAndClearQrInvite} from "./qr-invite-link.js";',"URL scrub helper");
const old=`watchAuth(user=>{
 if(!user?.isAnonymous){stop();showJoin();render();return;}
 void restore().catch(err=>{stop();showJoin();notice("恢復失敗："+err.message);render();});
});`;
const replacement=`// Read at page startup; remove QR secret from the address bar immediately.
const scanned=readAndClearQrInvite(window.location,window.history);
let pendingQrToken=scanned.token;
let autoJoinStarted=false;
if(scanned.kind==="invalid")notice("QR Code 連結格式無效，請聯絡老師重新確認。");
watchAuth(user=>{
 if(!user?.isAnonymous){
  stop();showJoin();render();
  if(user && pendingQrToken)notice("目前不是學生匿名帳號，請使用學生專用瀏覽器，避免影響教師登入。");
  else if(!user && pendingQrToken)
   void studentSignIn().catch(err=>notice("自動登入失敗："+err.message));
  return;
 }
 void restore().then(()=>{
  if(group){
   pendingQrToken=null;
   notice("已恢復小組身分，可以直接繼續闖關，不需要再次掃碼。");
   return;
  }
  if(!pendingQrToken || autoJoinStarted)return;
  autoJoinStarted=true;
  inviteInput.value=pendingQrToken;
  pendingQrToken=null;
  joinButton.click(); // Reuse existing one-time Firestore invitation transaction.
 }).catch(err=>{stop();showJoin();notice("恢復失敗："+err.message);render();});
});`;
boot=once(boot,old,replacement,"auth observer");
boot=once(boot,' }catch(err){notice("加入失敗："+err.message);}',
 ' }catch(err){inviteInput.value="";notice("加入失敗："+err.message);}',"scrub after failed claim");
await write("pilot2026-qr-join.html",html);
await write("pilot2026-qr-join-quest.js",js);
await write("pilot2026-qr-join-bootstrap.js",boot);
await copyFile(join(resolve("."),"qr-invite-link.js"),join(dir,"qr-invite-link.js"));
console.log("BUILT pilot2026 QR join page: no embedded tokens, stage1 only, NOT DEPLOYED.");
