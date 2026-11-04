// Phase 2 rehearsal-only manifest. No Firebase imports or live activation.
// Final activity ID and group count require explicit approval before production.
export const PHASE2_REHEARSAL=Object.freeze({
 activityId:"phase2sandbox",
 groups:Object.freeze(["group01","group02","group03"]),
 missions:Object.freeze([1,2,3,4,5]),
 studentsPerGroup:2,
 projectId:"demo-taipei-phase2"
});
const valid=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,60}$/.test(x);
export function validatePhase2Manifest(m=PHASE2_REHEARSAL){
 if(!m||!valid(m.activityId)||["pilot2026","demo2026"].includes(m.activityId))
  throw Error("Phase2 manifest must use an isolated non-pilot activity");
 if(!String(m.projectId).startsWith("demo-"))
  throw Error("Phase2 rehearsal must use a demo- emulator project");
 if(!Array.isArray(m.groups)||m.groups.length<3||
  m.groups.some(x=>!valid(x))||new Set(m.groups).size!==m.groups.length)
  throw Error("Need three distinct valid group IDs");
 if(!Array.isArray(m.missions)||JSON.stringify(m.missions)!=="[1,2,3,4,5]")
  throw Error("Five missions are required");
 if(m.studentsPerGroup!==2)throw Error("Phase2 rehearsal requires two students per group");
 return true;
}
export function createPhase2DryRunPlan(m=PHASE2_REHEARSAL){
 validatePhase2Manifest(m);
 return Object.freeze({
  mode:"DRY_RUN_NO_WRITES",
  projectId:m.projectId,
  activityId:m.activityId,
  groups:m.groups.map(groupId=>Object.freeze({
   groupId,documentPath:`activities/${m.activityId}/groups/${groupId}`,
   students:["student01","student02"].map(code=>Object.freeze({code,invite:"GENERATE_PRIVATELY_IN_EMULATOR"})),
   initialCompleted:0
  })),
  photoDocumentsCreated:0,
  missionDocumentsCreated:0,
  preserves:["pilot2026","demo2026","teacherAccess","invites"],
  deploymentAllowed:false
 });
}
