// Isolated Firebase Authentication foundation; not yet wired into the quest.
// Browser ESM SDK pinned to a version documented by Firebase.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "./firebase-config.js";

export const isConfigured = firebaseConfigReady;
export const auth = firebaseConfigReady
  ? getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export function watchAuth(callback) {
  if (!auth) throw new Error("請先設定 firebase-config.js 的網頁應用程式設定");
  return onAuthStateChanged(auth, callback);
}
export async function studentSignIn() {
  if (!auth) throw new Error("Firebase 尚未設定");
  if (auth.currentUser) {
    if (!auth.currentUser.isAnonymous) throw new Error("目前是非匿名帳號，請先登出再以學生身分登入");
    return auth.currentUser;
  }
  return (await signInAnonymously(auth)).user;
}
export async function teacherSignIn(email, password) {
  if (!auth) throw new Error("Firebase 尚未設定");
  if (auth.currentUser?.isAnonymous) await signOut(auth);
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // A valid email login is NOT proof of teacher authorization.
  // Teacher role must be checked by Firestore rules before reading any student data.
  return user;
}
export async function logout() {
  if (auth) await signOut(auth);
}
