import test from "node:test";
import assert from "node:assert/strict";
import {PHASE2_REHEARSAL,validatePhase2Manifest,createPhase2DryRunPlan} from "../phase2-rehearsal-manifest.js";
import {permittedByScope} from "../functions/pilot-scope.js";
import {readFileSync} from "node:fs";
const manifest=PHASE2_REHEARSAL;
test("Rehearsal manifest is limited to emulator, three groups, and six students",()=>{
 assert.equal(validatePhase2Manifest(),true);
 const plan=createPhase2DryRunPlan();
 assert.equal(plan.mode,"DRY_RUN_NO_WRITES");
 assert.equal(plan.deploymentAllowed,false);
 assert.equal(plan.projectId,"demo-taipei-phase2");
 assert.equal(plan.groups.length,3);
 assert.equal(plan.groups.flatMap(g=>g.students).length,6);
 assert.equal(plan.missionDocumentsCreated,0);
 assert.equal(plan.photoDocumentsCreated,0);
 assert.ok(plan.preserves.includes("pilot2026"));
});
test("Production and pilot2026 activity IDs are forbidden in rehearsal",()=>{
 for(const activityId of ["pilot2026","demo2026"]){
  assert.throws(()=>validatePhase2Manifest({...manifest,activityId}));
 }
 assert.throws(()=>validatePhase2Manifest({...manifest,projectId:"taipei-cultural-adventure"}));
 assert.throws(()=>validatePhase2Manifest({...manifest,groups:["group01","group01","group03"]}));
});
test("Five scope IDs per group allow only the rehearsal activity's groups",()=>{
 const scope={activityId:manifest.activityId,groups:manifest.groups,missions:manifest.missions};
 for(const groupId of manifest.groups)for(let missionId=1;missionId<=5;missionId++)
  assert.equal(permittedByScope(scope,{activityId:manifest.activityId,groupId,missionId}),true);
 for(const activityId of ["pilot2026","demo2026","taipei2027"])
  assert.equal(permittedByScope(scope,{activityId,groupId:"group01",missionId:1}),false);
 for(const groupId of ["group04","unlisted"])
  assert.equal(permittedByScope(scope,{activityId:manifest.activityId,groupId,missionId:1}),false);
});
test("Candidate rehearsal Storage rules cannot be confused with published pilot rules",()=>{
 const rules=readFileSync("docs/storage-phase2-rehearsal-emulator.rules","utf8");
 assert.ok(rules.includes("NEVER DEPLOY"));
 assert.ok(rules.includes('activityId == "phase2sandbox"'));
 assert.ok(rules.includes('activityId == "pilot2026" && groupId == "group01"'));
 assert.ok(rules.includes("request.auth.uid == uploaderUid"));
 assert.ok(rules.includes("request.resource.size <= 1024 * 1024"));
 assert.ok(rules.includes("allow update, delete: if false"));
 assert.ok(!readFileSync("docs/storage-pilot2026-stage5-candidate.rules","utf8").includes("phase2sandbox"));
 assert.ok(!readFileSync("functions/index.js","utf8").includes("phase2sandbox"));
});
