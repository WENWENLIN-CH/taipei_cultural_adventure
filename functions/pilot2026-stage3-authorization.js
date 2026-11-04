// Candidate-only authorization for third mission; never imported by deployed entrypoints.
import {permittedByScope} from "./pilot-scope.js";
export const PILOT2026_STAGE3=Object.freeze({
 activityId:"pilot2026",groups:Object.freeze(["group01"]),missions:Object.freeze([3])
});
export function allowStage3Candidate(data){
 return permittedByScope(PILOT2026_STAGE3,data);
}
