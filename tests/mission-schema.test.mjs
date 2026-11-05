import assert from "node:assert/strict";
import {validateSubmission,REQUIRED_PHOTO_KEYS} from "../mission-schema.js";
const photos = n=>Object.fromEntries(REQUIRED_PHOTO_KEYS[n].map((key,i)=>[key,`activities/demo2026/groups/group01/missions/${n}/u1/p${i+1}.jpg`]));
const answers={
  1:{location:"台北車站"},
  2:{lang1_lang:"日文",lang2_lang:"韓文",lang3_lang:"越南文",lang4_lang:"泰文"},
  3:{},
  4:{c1_continent:"亞洲",c1_country:"臺灣",c2_continent:"歐洲",c2_country:"義大利",c3_continent:"非洲",c3_country:"摩洛哥",},
  5:{p1_country:"菲律賓",p1_name:"A",p2_country:"泰國",p2_name:"B",p3_country:"越南",p3_name:"C"}
};
let total=0;
for(let n=1;n<=5;n++){
  assert.equal(validateSubmission(n,answers[n],photos(n)),true);
  total++;
  const missing=photos(n);delete missing[REQUIRED_PHOTO_KEYS[n][0]];
  assert.throws(()=>validateSubmission(n,answers[n],missing),/照片/);total++;
}
assert.throws(()=>validateSubmission(2,{...answers[2],lang4_lang:"日文"},photos(2)),/四種不同/);total++;
assert.throws(()=>validateSubmission(4,{...answers[4],c3_continent:"亞洲"},photos(4)),/三個不同洲/);total++;
assert.throws(()=>validateSubmission(5,{...answers[5],p3_country:"泰國"},photos(5)),/三個不同國家/);total++;
assert.throws(()=>validateSubmission(1,answers[1],{photo1:"data:image/jpeg;base64,aaa"}),/雲端上傳/);total++;
console.log(`All ${total} mission schema checks passed (local validation only).`);
