// Pure, dependency-injected Phase2 reusable group QR admission handler.
// Used by the isolated callable entry and Firestore Emulator tests.
import {createHash,timingSafeEqual} from "node:crypto";
export const qrDigest=code=>createHash("sha256").update(code,"utf8").digest("hex");
const good=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,60}$/.test(x);
export function createPhase2JoinHandler({db,activityId,groupIds,serverTimestamp,makeError}){
 if(!good(activityId)||!Array.isArray(groupIds)||groupIds.length!==3||
  new Set(groupIds).size!==3||groupIds.some(g=>!good(g)))
  throw Error("Invalid Phase2 join scope");
 const fail=(code,message)=>{throw makeError(code,message);};
 return async function join({uid,anonymous,data}){
  if(!uid||!anonymous)return fail("unauthenticated","請先匿名登入");
  const groupId=data?.groupId,code=data?.code;
  if(!groupIds.includes(groupId)||typeof code!=="string"||!/^[a-f0-9]{48}$/.test(code))
   return fail("invalid-argument","小組 QR Code 無效");
  return db.runTransaction(async tx=>{
   const base=`activities/${activityId}/groups/`;
   const groupRef=db.doc(base+groupId);
   const members=groupIds.map(g=>db.doc(base+g+"/members/"+uid));
   const snaps=await Promise.all([tx.get(groupRef),...members.map(ref=>tx.get(ref))]);
   const group=snaps[0];
   const info=group.data()||{};
   const hashed=typeof info.joinTokenHash==="string"&&/^[a-f0-9]{64}$/.test(info.joinTokenHash)
    ?Buffer.from(info.joinTokenHash,"hex"):Buffer.alloc(32);
   const match=timingSafeEqual(hashed,Buffer.from(qrDigest(code),"hex"));
   if(!group.exists||info.phase2!==true||info.maxMembers!==7||!match)
    return fail("permission-denied","這張小組 QR Code 無效或已停用");
   if(snaps.slice(1).some((snap,i)=>groupIds[i]!==groupId && snap.exists))
    return fail("permission-denied","此手機已加入另一組");
   const current=snaps[1+groupIds.indexOf(groupId)];
   if(current.exists){
    if(current.data()?.revoked===true)return fail("permission-denied","組員身分已停用");
    return {activityId,groupId,studentCode:current.data().studentCode,restored:true};
   }
   const count=info.memberCount;
   if(!Number.isInteger(count)||count<0||count>=7)
    return fail("resource-exhausted","本組七個名額已滿");
   const studentCode=`G${groupIds.indexOf(groupId)+1}-S${String(count+1).padStart(2,"0")}`;
   tx.create(members[groupIds.indexOf(groupId)],{studentCode,joinedAt:serverTimestamp(),revoked:false});
   tx.update(groupRef,{memberCount:count+1});
   return {activityId,groupId,studentCode,restored:false};
  });
 };
}
