# Trusted mission submission — development only (2026-11-03)

## Why a server?
Firestore rules cannot securely prove that a client-supplied Cloud Storage object exists and is owned by the same group. Client-submitted URLs or paths alone must never trigger completion.

## What is implemented?
- `functions/submission-core.js`: checks 5 missions' field requirements and exact canonical image paths, rejecting other group/mission/slot paths.
- `functions/index.js`: a 2nd-generation callable function, only for `demo2026`, requiring anonymous Firebase Auth and membership, checking the **real** private Storage object + uploader's group membership + metadata + JPEG signature and using a Firestore create-only transaction. Stores `submittedByUid`, `submittedByCode`, `submittedAt`, answers, photo paths, and `status: completed`.
- `mission-submission.js`: caller-side adapter; no more direct Firestore completion writes.
- `functions/test/submission-core.test.mjs`: pure validation tests; they do not prove Cloud Function or real Storage behavior.

## Test now — no deployment
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
cd functions
npm install
npm test
```
Do not run any `firebase deploy --only functions` yet. The function is NOT active, and the quest UI is NOT integrated.

## Important safety gates before enabling
1. Run end-to-end callable tests using Functions + Firestore + Storage emulators (including forged paths, missing objects, mismatched uploader, duplicate submission, cross-group attempts and concurrent submit).
2. Confirm actual five mission answer shapes match `script.js`. Frontend and server validation currently use a provisional field contract, not the full original quiz.
3. Ensure `functions/index.js` appropriately handles partial files and server failures. Photos uploaded before a failed submission remain in storage and require a cleanup/retake strategy.
4. Set a billing budget, Firebase App Check when practical, Cloud Function rate limits and monitor Cloud Build/Artifact Registry charges. The current `maxInstances:2` is a limit on concurrent instances, not a hard billing cap.
5. Only a trusted server should set `status: completed`. Keep Firestore client write permissions denied for missions.
6. Keep mock mission 1 completion separate. The earlier console-inserted `missions/1` is not a genuine submission and will prevent a later create-only transaction.
7. Teacher backend four fields only: group progress, submitted answers/photos, submitter/time, final unlock; no extra tracking.
8. For production school activities, set up authorized member recovery and school rules for minors' photos.

## In-scope testing
Current plan: three groups, 13 required photos per group = 39 submitted photos total (not counting optional retakes and failed submissions).
