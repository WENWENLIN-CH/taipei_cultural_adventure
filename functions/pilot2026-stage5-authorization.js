// Stage5 candidate-only allowlist; never exported from existing live entrypoints.
import {permittedByScope} from "./pilot-scope.js";
export const PILOT2026_STAGE5=Object.freeze({
 activityId:"pilot2026",groups:Object.freeze(["group01"]),missions:Object.freeze([5])
});
export function allowStage5Candidate(data){
 return permittedByScope(PILOT2026_STAGE5,data);
}
