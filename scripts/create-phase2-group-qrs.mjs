// Generate exactly three private reusable QR PNGs after guarded live provisioning.
// NEVER upload QR images or their credentials to GitHub.
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import QRCode from "qrcode";
import {makePhase2QrUrl} from "../phase2-qr-link.js";
const file=resolve(".phase2-private-invites.txt");
const lines=(await readFile(file,"utf8")).trim().split(/\r?\n/).slice(1);
if(lines.length!==3)throw Error("Expected exactly three private group credentials");
const groups=["group01","group02","group03"];
const output=resolve(".private-qrcodes");
await mkdir(output,{recursive:true,mode:0o700});
for(let i=0;i<3;i++){
 const [groupId,code]=lines[i].split("\t");
 if(groupId!==groups[i]||!/^[a-f0-9]{48}$/.test(code))throw Error("Invalid private credential file");
 const url=makePhase2QrUrl("https://taipei-cultural-adventure.web.app",groupId,code);
 const png=await QRCode.toBuffer(url,{errorCorrectionLevel:"M",width:640,margin:2});
 await writeFile(join(output,`phase2-${groupId}.png`),png,{mode:0o600,flag:"wx"});
}
console.log("CREATED 3 private reusable QR PNG files in .private-qrcodes/. No secrets printed.");
