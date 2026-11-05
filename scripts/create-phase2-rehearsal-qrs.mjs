// Build three PRIVATE QR PNGs for rehearsal Hosting preview channel.
// Never prints QR URLs or credentials. Never accepts official Hosting domain.
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import QRCode from "qrcode";
const args=process.argv.slice(2);
if(args.length!==1||!args[0].startsWith("--origin="))
 throw Error("Provide --origin=https://<rehearsal-preview>.web.app");
const origin=new URL(args[0].slice("--origin=".length));
if(origin.protocol!=="https:"||
 !/^taipei-cultural-adventure--phase2-rehearsal-[a-z0-9-]+[.]web[.]app$/.test(origin.hostname)||
 origin.pathname!=="/"||origin.search||origin.hash)
 throw Error("Only the private rehearsal preview channel URL is allowed");
const privateDir=resolve(".phase2-live-rules-backup");
const lines=(await readFile(join(privateDir,"rehearsal-private.txt"),"utf8")).trim().split(/\r?\n/).slice(1);
if(lines.length!==3)throw Error("Exactly 3 rehearsal credentials required");
const target=join(privateDir,"rehearsal-qrs");
await mkdir(target,{recursive:true,mode:0o700});
for(let i=0;i<3;i++){
 const [group,code]=lines[i].split("\t");
 if(group!=="group0"+(i+1)||!/^[a-f0-9]{48}$/.test(code))
  throw Error("Invalid private rehearsal credentials");
 const url=origin.origin+"/phase2-student-quest.html#group="+group+"&code="+code;
 const png=await QRCode.toBuffer(url,{width:640,margin:2,errorCorrectionLevel:"M"});
 await writeFile(join(target,"rehearsal-"+group+".png"),png,{mode:0o600,flag:"wx"});
}
console.log("CREATED: three private rehearsal QR PNGs inside .phase2-live-rules-backup/rehearsal-qrs/");
console.log("Do not paste QR URLs or private credentials in chat. Official QR PNGs unchanged.");
