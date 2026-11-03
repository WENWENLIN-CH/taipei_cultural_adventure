// Firebase Web App public client configuration (not an administrator credential).
// Access to student data must be enforced by Authentication and Firestore/Storage rules.
export const firebaseConfig = {
  apiKey: "AIzaSyAG8sRScFRLR-pL_IoLLCUYpNQmupzyY1Y",
  authDomain: "taipei-cultural-adventure.firebaseapp.com",
  projectId: "taipei-cultural-adventure",
  storageBucket: "taipei-cultural-adventure.firebasestorage.app",
  messagingSenderId: "852979150342",
  appId: "1:852979150342:web:51cec6b044727f65965d87",
  measurementId: "G-PLR3BVE6HS"
};
export const firebaseConfigReady =
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
