// Stage5-specific server precondition; independent of any client-side button or localStorage.
// Only reads pilot2026/group01/mission4. Never changes existing stages.
export async function requireStage4Completed({db,data,makeError}){
 const ref=db.doc("activities/pilot2026/groups/group01/missions/4");
 const snap=await ref.get();
 if(!snap.exists || snap.data()?.status!=="completed")
  throw makeError("failed-precondition","請先完成第四關，才可提交第五關");
 return true;
}
