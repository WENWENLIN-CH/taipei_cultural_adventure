// OFFLINE read-only inspection of backed-up production rules.
// Never logs the rule source, photo URLs, private credential values, or QR codes.
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
const dir=resolve(".phase2-live-rules-backup");
const EXPECTED={
 firestore:"4da16b5e5760d7ec076fdf62f2d5ad1a39654ddb20a293f6facb9d34221f0a9e",
 storage:"17d95cab3ea0ccefdc2334af573b22372e02a8f1f4febd00fa33a32ed4535625"
};
const SHA=s=>createHash("sha256").update(s).digest("hex");
const rules={};
for(const name of ["firestore","storage"]){
 rules[name]=await readFile(join(dir,name+".rules"),"utf8");
 if(SHA(rules[name])!==EXPECTED[name])
  throw Error(name+" live backup has changed since verified snapshot; inspect before proceeding");
}
function summarized(name,s){
 const withoutComments=s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"");
 const lines=withoutComments.split("\n");
 const matches=[...withoutComments.matchAll(/^\s*match\s+(.*?)\s*\{\s*$/gm)].map(x=>x[1]);
 const fns=[...withoutComments.matchAll(/\bfunction\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/g)].map(x=>x[1]);
 const counts={
  get:(withoutComments.match(/\ballow\s+get\s*:/g)||[]).length,
  list:(withoutComments.match(/\ballow\s+list\s*:/g)||[]).length,
  create:(withoutComments.match(/\ballow\s+create\s*:/g)||[]).length,
  update:(withoutComments.match(/\ballow\s+update\s*:/g)||[]).length,
  delete:(withoutComments.match(/\ballow\s+delete\s*:/g)||[]).length
 };
 const flags={
  demo2026:withoutComments.includes("demo2026"),
  pilot2026:withoutComments.includes("pilot2026"),
  phase2sandbox:withoutComments.includes("phase2sandbox"),
  taipei2026:withoutComments.includes("taipei2026"),
  teacherAccess:withoutComments.includes("teacherAccess"),
  revoked:withoutComments.includes("revoked"),
  joinTokenHash:withoutComments.includes("joinTokenHash"),
  broadAllowTrue:/\ballow\s+[^:]+:\s*if\s+true\s*;/.test(withoutComments),
  isFunctionScopedPhoto:matches.some(x=>x.includes("missions/")&&x.includes("filename"))
 };
 // Do not print full source or match paths containing data / tokens.
 const pathShapes=matches.map(x=>x.replace(/\{[^}]+\}/g,"{…}"))
  .filter(x=>!/[A-Fa-f0-9]{32,}/.test(x));
 const reviewLines=lines.map((line,i)=>({line:i+1,text:line.trim()}))
  .filter(x=>/\b(allow|function|match)\b/.test(x.text))
  .slice(0,65).map(x=>({
   line:x.line,kind:/^match\b/.test(x.text)?"match":/^function\b/.test(x.text)?"function":"allow",
   // Only report keywords, not the source expression or values.
   action:x.text.match(/\ballow\s+([\w, ]+)/)?.[1]?.trim()||null,
   signature:x.text.match(/\bfunction\s+([A-Za-z0-9_]+)/)?.[1]||null
  }));
 return {name,sha256:SHA(s),length:s.length,
  matchPathShapes:pathShapes,functionNames:fns,allowCounts:counts,flags,
  declarations:reviewLines};
}
const report={
 projectId:"taipei-cultural-adventure",
 mode:"OFFLINE_READ_ONLY",
 validatedBackupHashes:true,
 firestore:summarized("firestore",rules.firestore),
 storage:summarized("storage",rules.storage)
};
console.log(JSON.stringify(report,null,2));
console.log("No complete rule source printed; no Firebase network operations performed.");
