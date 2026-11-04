import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(p,"utf8");
const digest=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const source={index:digest("index.html"),script:digest("script.js"),bootstrap:digest("cloud-quest-bootstrap.js")};
execFileSync(process.execPath,["scripts/build-combined-five-preview.mjs"],{stdio:"inherit"});
assert.equal(digest("index.html"),source.index);
assert.equal(digest("script.js"),source.script);
assert.equal(digest("cloud-quest-bootstrap.js"),source.bootstrap);
const dir=".firebase-preview/";
for(const p of ["five-quest.html","five-quest.js","cloud-quest.html","pilot-quest.html","teacher-dashboard.html","teacher-dashboard.js","mission-upload-recovery.js"]){
 assert.ok(read(dir+p).length>40,p+" missing");
}
const five=read(dir+"five-quest.html"),normal=read(dir+"cloud-quest-bootstrap.js"),pilot=read(dir+"cloud-quest-pilot-bootstrap.js"),teacher=read(dir+"teacher-dashboard.js");
assert.ok(five.includes('src="five-quest.js"'));
assert.ok(five.includes("禁止雲端提交"));
assert.ok(normal.includes("const SUBMISSIONS_ENABLED=false;"));
assert.ok(pilot.includes("const SUBMISSIONS_ENABLED=true;"));
assert.ok(pilot.includes('const PILOT_GROUP="group01";'));
assert.ok(pilot.includes("const PILOT_MISSION=3;"));
assert.ok(read(dir+"pilot-quest.html").includes('src="cloud-quest-pilot-bootstrap.js"'));
assert.ok(teacher.includes("getBlob(ref(storage,path),2*1024*1024)"));
assert.ok(teacher.includes('blob.slice(0,3).arrayBuffer()'));
const hosting=JSON.parse(read("firebase.json"));
assert.equal(hosting.hosting.public,".firebase-preview");
console.log("PASS: combined same-origin preview contains five-quest, prior pilot and teacher dashboard; no source files changed and no deployment.");
