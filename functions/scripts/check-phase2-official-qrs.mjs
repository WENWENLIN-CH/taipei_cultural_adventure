// Official QR credential and pristine group check. Read-only and no secrets printed.
import {readFile,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {createRequire} from "node:module";
const root=resolve("."),groups=["group01","group02","group03"];
const content=(await readFile(join(root,".phase2-private-invites.txt"),"utf8")).trim().split(/\r?\n/);
const lines=content.slice(1);
if(lines.length!==3)throw Error("Expected exactly three official QR credentials");
const qr=new Map(lines.map(line=>{
 const [group,code]=line.trim().split(/\s+/);
 if(!groups.includes(group)||!/^[a-f0-9]{48}$/.test(code))throw Error("Invalid private official invitation file");
 return [group,code];
}));
if(qr.size!==3)throw Error("Duplicate official QR group");
for(const group of groups){
 const png=join(root,".private-qrcodes","phase2-"+group+".png");
 if((await stat(png)).size<500)throw Error("Missing or invalid-looking QR PNG for "+group);
}
const requireAdmin=createRequire(resolve("functions/package.json"));
const {initializeApp,applicationDefault}=requireAdmin("firebase-admin/app");
const {getFirestore}=requireAdmin("firebase-admin/firestore");
if(["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"].some(k=>process.env[k]))
 throw Error("Live QR check must not use emulators");
const credential=applicationDefault();await credential.getAccessToken();
initializeApp({projectId:"taipei-cultural-adventure",credential});
const db=getFirestore();
const docs=await db.getAll(...groups.map(group=>db.doc("activities/taipei2026/groups/"+group)));
for(let i=0;i<3;i++){
 const data=docs[i].data();
 const hashed=createHash("sha256").update(qr.get(groups[i])).digest("hex");
 if(!docs[i].exists||data?.joinTokenHash!==hashed||data?.memberCount!==0||data?.maxMembers!==10)
  throw Error("Official QR or group state mismatch: "+groups[i]);
 console.log("PASS official QR hash matches Firestore: "+groups[i]+" (no secrets displayed)");
}
console.log("PASS: Three downloaded official QR credentials match reserved three groups; READ-ONLY.");
