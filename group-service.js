// Invitation-based group enrollment foundation. This is a DEVELOPMENT module.
// Invitations are created by the teacher in Firebase Console (not by clients).
import { auth, isConfigured } from "./firebase-auth.js";
import {
  getFirestore, doc, getDoc, runTransaction, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
export const db = isConfigured ? getFirestore(auth.app) : null;
const MEMBERSHIP_CACHE_KEY = "taipeiQuestGroupMembershipV1";
const TOKEN_PATTERN = /^[a-f0-9]{48}$/i;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,60}$/;
function requireStudent() {
  if (!auth?.currentUser?.isAnonymous) throw new Error("請先使用學生匿名登入");
  return auth.currentUser.uid;
}
export async function joinByInvitation(rawToken) {
  const uid = requireStudent();
  const token = rawToken.trim();
  if (!TOKEN_PATTERN.test(token)) throw new Error("加入碼格式不正確（應為 48 位英數碼）");
  const inviteRef = doc(db, "invites", token);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("找不到此加入碼");
  const info = inviteSnap.data();
  if (!ID_PATTERN.test(info.activityId ?? "") || !ID_PATTERN.test(info.groupId ?? "")) {
    throw new Error("加入碼資料有誤");
  }
  const memberRef = doc(db, "activities", info.activityId, "groups", info.groupId, "members", uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(inviteRef);
    if (!snap.exists() || snap.data().claimedBy !== null) {
      throw new Error("此加入碼已使用，請向老師索取新的加入碼");
    }
    tx.update(inviteRef, { claimedBy: uid, claimedAt: serverTimestamp() });
    tx.set(memberRef, {
      inviteId: token,
      studentCode: snap.data().studentCode,
      joinedAt: serverTimestamp()
    });
  });
  const group = {activityId: info.activityId, groupId: info.groupId, studentCode: info.studentCode};
  localStorage.setItem(MEMBERSHIP_CACHE_KEY, JSON.stringify({uid,...group}));
  return group;
}
export function watchGroupMissions({activityId,groupId}, callback, onError) {
  requireStudent();
  if (!ID_PATTERN.test(activityId) || !ID_PATTERN.test(groupId)) throw new Error("小組資訊不正確");
  const unsubs = [1,2,3,4,5].map(id => onSnapshot(
    doc(db,"activities",activityId,"groups",groupId,"missions",String(id)),
    snap => callback(id, snap.exists() ? snap.data() : null),
    onError
  ));
  return () => unsubs.forEach(unsub => unsub());
}

export async function resumeGroup() {
  const uid=requireStudent();
  let saved;
  try {saved=JSON.parse(localStorage.getItem(MEMBERSHIP_CACHE_KEY));} catch {return null;}
  if (!saved || saved.uid!==uid || !ID_PATTERN.test(saved.activityId ?? "") || !ID_PATTERN.test(saved.groupId ?? "")) return null;
  const memberRef=doc(db,"activities",saved.activityId,"groups",saved.groupId,"members",uid);
  try {
    const snap=await getDoc(memberRef);
    if(!snap.exists() || snap.data().revoked===true) return null;
    return {activityId:saved.activityId,groupId:saved.groupId,studentCode:snap.data().studentCode};
  } catch {return null;}
}
export function clearLocalGroup() {
  localStorage.removeItem(MEMBERSHIP_CACHE_KEY);
}

export function cacheVerifiedGroup(group){
 const uid=requireStudent();
 if(!group||![group.activityId,group.groupId,group.studentCode].every(x=>typeof x==="string"&&ID_PATTERN.test(x)))
  throw Error("伺服器回傳的小組身分不正確");
 localStorage.setItem(MEMBERSHIP_CACHE_KEY,JSON.stringify({uid,...group}));
}
