import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {FORM_SPEC,extractMissionForm,mapUploadedPaths} from "../mission-form-adapter.js";
import {REQUIRED_PHOTO_KEYS,validateSubmission} from "../mission-schema.js";
import {PHOTO_KEYS,validateGroupPayload} from "../functions/submission-core.js";

const original=readFileSync("script.js","utf8");
const start=original.indexOf("const missions = [");
const end=original.indexOf("\n];",start);
assert.ok(start>=0 && end>start,"Cannot find the original mission definitions");
const definition=original.slice(start,end+3);
const missions=vm.runInNewContext(definition+"\nmissions;",Object.create(null));
let checks=0;
for(const mission of missions){
 const spec=FORM_SPEC[mission.id];
 assert.ok(spec,`Missing adapter for mission ${mission.id}`);
 const originalKeys={photos:[],answers:[]};
 for(const field of mission.fields){
   if(field.type==="text"){originalKeys.answers.push(field.key);}
   else if(field.type==="photo"){originalKeys.photos.push(field.key);}
   else if(field.type==="pair"){originalKeys.answers.push(field.key+"_lang");originalKeys.photos.push(field.key+"_photo");}
   else if(field.type==="continent"){originalKeys.answers.push(...["continent","country"].map(x=>field.key+"_"+x));originalKeys.photos.push(field.key+"_photo");}
   else if(field.type==="product"){originalKeys.answers.push(...["country","name"].map(x=>field.key+"_"+x));originalKeys.photos.push(field.key+"_photo");}
   else throw Error("Unsupported original field type "+field.type);
 }
 assert.deepEqual([...originalKeys.answers].sort(),[...spec.answerKeys].sort(),`Mission ${mission.id} answer keys diverged`);
 assert.deepEqual([...originalKeys.photos].sort(),[...spec.photoKeys].sort(),`Mission ${mission.id} photo keys diverged`);
 assert.deepEqual([...PHOTO_KEYS[mission.id]].sort(),[...spec.photoKeys].sort());
 assert.deepEqual([...REQUIRED_PHOTO_KEYS[mission.id]].sort(),[...spec.photoKeys].sort());
 checks++;
 const answers=Object.fromEntries(spec.answerKeys.map(key=>[key,"測試答案"]));
 if(mission.id===2){Object.assign(answers,{lang1_lang:"韓文",lang2_lang:"泰文",lang3_lang:"越南文",lang4_lang:"英文"});}
 if(mission.id===4){Object.assign(answers,{c1_continent:"亞洲",c2_continent:"歐洲",c3_continent:"非洲"});}
 if(mission.id===5){Object.assign(answers,{p1_country:"泰國",p2_country:"越南",p3_country:"馬來西亞"});}
 const photos=Object.fromEntries(spec.photoKeys.map(key=>[key,"data:image/jpeg;base64,/9j/"]));
 const {answers:extracted,localPhotos}=extractMissionForm(mission.id,{...answers,...photos,safetyCheck:true});
 assert.deepEqual(extracted,answers);
 assert.equal(Object.keys(localPhotos).length,spec.photoKeys.length);
 const uploads=Object.fromEntries(spec.photoKeys.map(key=>[key,`activities/demo2026/groups/group01/missions/${mission.id}/student123/${key}.jpg`]));
 const paths=mapUploadedPaths(mission.id,uploads);
 assert.equal(validateSubmission(mission.id,extracted,paths),true);
 validateGroupPayload({activityId:"taipei2026rehearsal",groupId:"group01",missionId:mission.id,answers:extracted,photoPaths:paths});
 checks++;
 assert.throws(()=>extractMissionForm(mission.id,{...answers,...photos,safetyCheck:false}),/安全事項/);
 assert.throws(()=>extractMissionForm(mission.id,{...answers,...photos,[spec.photoKeys[0]]:"",safetyCheck:true}),/照片/);
 checks++;
}
assert.equal(Object.values(FORM_SPEC).flatMap(s=>s.photoKeys).length,13);
console.log(`All ${checks} mission form and cloud contract checks passed (local only).`);
