// Firebase Web App configuration for the DEVELOPMENT branch only.
// Copy the exact values from Firebase Console > Project settings > Your apps.
// Firebase apiKey is a public client configuration identifier, NOT an admin key.
// Do not place service-account credentials or passwords in this file.
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
  authDomain: "taipei-cultural-adventure.firebaseapp.com",
  projectId: "taipei-cultural-adventure",
  appId: "REPLACE_WITH_FIREBASE_WEB_APP_ID"
};
export const firebaseConfigReady =
  !firebaseConfig.apiKey.startsWith("REPLACE_WITH") &&
  !firebaseConfig.appId.startsWith("REPLACE_WITH");
