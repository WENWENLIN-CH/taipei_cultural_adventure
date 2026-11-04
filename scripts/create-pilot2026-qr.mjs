// Offline QR creation for ONE unused invitation (no online QR services).
// NEVER pass tokens through CLI arguments, URLs sent to services, or GitHub.
// Output PNG is private and ignored by Git; treat it like an invitation code.
import {createInterface} from "node:readline/promises";
import {stdin as input,stdout as output} from "node:process";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {makeQrJoinUrl} from "../qr-invite-link.js";

const origin=process.argv[2]??"https://taipei-cultural-adventure--auth-test-h1vdhpta.web.app";
if(process.argv.length>3)throw Error("Do not pass private invitation codes via command-line arguments");
const rl=createInterface({input,output});
let token;
try {token=(await rl.question("請貼上尚未使用的 48 位學生邀請碼（輸入時會顯示，勿截圖）：")).trim();}
finally{rl.close();}
const url=makeQrJoinUrl(origin,token);
const {default:QRCode}=await import("qrcode");
const png=await QRCode.toBuffer(url,{type:"png",errorCorrectionLevel:"M",width:520,margin:4});
const dir=resolve(".private-qrcodes");
await mkdir(dir,{recursive:true,mode:0o700});
const outputPath=join(dir,"pilot2026-student-qr.png");
await writeFile(outputPath,png,{mode:0o600});
console.log("已在本機建立私人 QR 圖檔："+outputPath);
console.log("圖檔內含私人加入碼，請只傳給指定測試學生；不要上傳至 GitHub 或公開群組。");
console.log("掃碼前不會動到 Firebase；真正加入時才會消耗一次性邀請碼。");
