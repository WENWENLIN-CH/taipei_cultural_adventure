// Stage4 candidate-only allowlist; never exported from existing live entrypoints.
import {permittedByScope} from "./pilot-scope.js";
export const PILOT2026_STAGE4=Object.freeze({
 activityId:"pilot2026",groups:Object.freeze(["group01"]),missions:Object.freeze([4])
});
export function allowStage4Candidate(data){
 return permittedByScope(PILOT2026_STAGE4,data);
}
