import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
test("all five photo field types use an image picker without forced camera capture",()=>{
 const code=read("script.js");
 assert.ok(code.includes('type="file" accept="image/*"'));
 assert.ok(!code.includes('capture="environment"'),"Camera capture attribute must not force mobile camera");
 assert.ok(code.includes("選擇照片（可從相簿挑選）"));
 assert.ok(code.includes('if(el.type==="file")'));
 assert.ok(code.includes("compressImage(file)"));
 assert.ok(code.includes("ms.data[key] = dataUrl"));
});
test("pilot2026 rehearsal and cloud pages inherit gallery-capable photo fields",()=>{
 execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"pipe"});
 for(const filename of ["pilot2026-rehearsal.js","pilot2026-cloud-quest.js","five-quest.js","cloud-quest.js"]){
   const js=read(".firebase-preview/"+filename);
   assert.ok(js.includes("選擇照片（可從相簿挑選）"),filename+" gallery label missing");
   assert.ok(!js.includes('capture="environment"'),filename+" still forces camera");
   assert.ok(js.includes('type="file" accept="image/*"'),filename+" file picker unavailable");
   assert.ok(js.includes('compressImage(file)'),filename+" compression flow changed");
 }
});
