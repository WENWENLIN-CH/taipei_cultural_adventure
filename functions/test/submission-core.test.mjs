import test from "node:test";
import assert from "node:assert/strict";
import {PHOTO_KEYS,validateGroupPayload,parseVerifiedPhotoPath} from "../submission-core.js";
const base={activityId:"demo2026",groupId:"group01"};
const answers={
  1:{location:"台北"},2:{lang1_lang:"越南文",lang2_lang:"泰文",lang3_lang:"韓文",lang4_lang:"英文"},
  3:{restaurant:"測試"},
  4:{c1_continent:"亞洲",c1_country:"台灣",c1_restaurant:"A",c2_continent:"非洲",c2_country:"埃及",c2_restaurant:"B",c3_continent:"歐洲",c3_country:"法國",c3_restaurant:"C"},
  5:{p1_country:"泰國",p1_name:"1",p2_country:"越南",p2_name:"2",p3_country:"菲律賓",p3_name:"3"}
};
for(let missionId=1;missionId<=5;missionId++){
 const photoPaths=Object.fromEntries(PHOTO_KEYS[missionId].map(k=>[k,`activities/demo2026/groups/group01/missions/${missionId}/testUID/${k}.jpg`]));
 test(`mission ${missionId}: all required fields accepted`,()=>assert.equal(validateGroupPayload({...base,missionId,answers:answers[missionId],photoPaths}).missionId,missionId));
 test(`mission ${missionId}: missing photo rejected`,()=>assert.throws(()=>validateGroupPayload({...base,missionId,answers:answers[missionId],photoPaths:{}})));
 for(const k of PHOTO_KEYS[missionId]){
  test(`mission ${missionId}: photo ${k} must match exact group, slot and mission`,()=>{
    parseVerifiedPhotoPath(photoPaths[k],{...base,missionId,photoKey:k});
    assert.throws(()=>parseVerifiedPhotoPath(photoPaths[k].replace("group01","group02"),{...base,missionId,photoKey:k}));
    assert.throws(()=>parseVerifiedPhotoPath(photoPaths[k].replace("testUID","../admin"),{...base,missionId,photoKey:k}));
    assert.throws(()=>parseVerifiedPhotoPath(photoPaths[k],{...base,missionId,photoKey:"another"}));
  });
 }
}
test("reject duplicate countries",()=>assert.throws(()=>validateGroupPayload({...base,missionId:5,answers:{...answers[5],p3_country:"泰國"},photoPaths:Object.fromEntries(PHOTO_KEYS[5].map(k=>[k,`activities/demo2026/groups/group01/missions/5/u/${k}.jpg`]))})));
test("reject excessively long answer",()=>assert.throws(()=>validateGroupPayload({...base,missionId:1,answers:{location:"x".repeat(301)},photoPaths:{photo1:"activities/demo2026/groups/group01/missions/1/u/photo1.jpg"}})));
