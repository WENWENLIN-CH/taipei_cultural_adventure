// Phase2 server-side authorization candidate ONLY. Not wired to any deployed callable.
// A static rehearsal scope cannot be widened by client-supplied activity/group IDs.
import {permittedByScope} from "./pilot-scope.js";
export const PHASE2_SERVER_CANDIDATE=Object.freeze({
 activityId:"phase2sandbox",
 groups:Object.freeze(["group01","group02","group03"]),
 missions:Object.freeze([1,2,3,4,5])
});
export function allowPhase2Submission(data,scope=PHASE2_SERVER_CANDIDATE){
 return permittedByScope(scope,data);
}
