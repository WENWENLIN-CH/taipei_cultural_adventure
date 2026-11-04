// Prospective activity policy. Pure functions: no Firebase calls and no deployment.
// This manifest is NOT connected to the production callable. To activate a pilot
// a future reviewed change must separately update server and frontend gates.
export const CURRENT_LIVE_PILOT = Object.freeze({
 activityId:"demo2026",groups:Object.freeze(["group01"]),missions:Object.freeze([3])
});
export const PROPOSED_ISOLATED_PILOT = Object.freeze({
 activityId:"pilot2026",groups:Object.freeze(["group01","group02","group03"]),missions:Object.freeze([1,2,3,4,5])
});
const valid=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,60}$/.test(x);
export function permittedByScope(scope,data){
 if(!scope||!data||!valid(data.activityId)||!valid(data.groupId)||
    !Number.isInteger(data.missionId)||!Array.isArray(scope.groups)||!Array.isArray(scope.missions))
   return false;
 return data.activityId===scope.activityId &&
  scope.groups.includes(data.groupId) &&
  scope.missions.includes(data.missionId);
}
// Future opt-in path must require BOTH an explicit operator-approved allowlist
// and a non-production activation guard. Never activate from client input.
export function permittedInEnvironment({isEmulator,scope,data}){
 if(!isEmulator)return permittedByScope(CURRENT_LIVE_PILOT,data);
 return permittedByScope(scope,data);
}
