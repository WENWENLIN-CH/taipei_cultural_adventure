// Candidate-only policy; not imported by existing deployed callable.
import {permittedByScope} from "./pilot-scope.js";
export const PILOT2026_STAGE2=Object.freeze({
 activityId:"pilot2026",groups:Object.freeze(["group01"]),missions:Object.freeze([2])
});
export function allowStage2Candidate(data){
 return permittedByScope(PILOT2026_STAGE2,data);
}
