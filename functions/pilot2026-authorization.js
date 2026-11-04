// Candidate-only server allowlist: do NOT import in functions/index.js.
// Stage 1 is intentionally limited to one non-production group and mission.
import {permittedByScope,CURRENT_LIVE_PILOT} from "./pilot-scope.js";

export const PILOT2026_STAGE1=Object.freeze({
 activityId:"pilot2026",
 groups:Object.freeze(["group01"]),
 missions:Object.freeze([1])
});
export const PILOT2026_FIVE_QUESTS=Object.freeze({
 activityId:"pilot2026",
 groups:Object.freeze(["group01","group02","group03"]),
 missions:Object.freeze([1,2,3,4,5])
});
export function allowCandidateSubmission({stage="stage1",data}){
 const scope=stage==="stage1"?PILOT2026_STAGE1:
  stage==="five-quests"?PILOT2026_FIVE_QUESTS:null;
 return scope!==null && permittedByScope(scope,data);
}
export function allowDeployedSubmission(data){
 // Fail closed until a separately reviewed release changes the real
 // callable entrypoint; this function does not switch live authorization.
 return permittedByScope(CURRENT_LIVE_PILOT,data);
}
