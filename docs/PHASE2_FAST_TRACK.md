# Phase 2 — two-hour field activity fast track

This candidate is **not deployed**. Work only on `feature/firebase-sync`.

## Already done
- Multi-group submission core and sequential transaction check: emulator tests passed (user reported 9/9 integrated, 6/6 submission, 4/4 preflight).
- Existing `pilot2026` callables and `functions/index.js` remain untouched.

## New independent Phase 2 backend candidate
- `functions/phase2-live-entry.js` exports only `submitPhase2Mission`.
- Explicit server-side `PHASE2_ACTIVITY_ID` and comma-separated `PHASE2_GROUP_IDS` required; disabled if missing.
- Rejects `demo2026`, `pilot2026`, and `phase2sandbox` as live activity IDs.
- Reuses verified JPEG and membership checks; previous mission is checked inside the Firestore transaction.
- `firebase.phase2-live-functions.json` defines a separate Functions codebase; builder does not deploy.

## Safe Cloud Shell check (no deploy)
```bash
git pull origin feature/firebase-sync
node scripts/build-phase2-live-functions.mjs
npm run test:phase2-integrated
npm run test:phase2-three-groups-submission
npm run test:pilot2026-stage45-release-preflight
```

## Required before any release
1. Pick the real event ID and exact group list, and define secured server environment for these values.
2. Review the live Firestore/Storage rules in Firebase Console, provision group/invitation records with create-only semantics, and check teacher authorizations.
3. Add real callable-invocation emulator tests and verify student mobile front end, snapshots, photo upload, 5/5 unlock, teacher dashboard activity selection and four requested fields.
4. Perform negative security tests (other group, revoked student, unauthenticated, duplicate, ordered progression) and two-device manual check.
5. Deploy individually reviewed Functions and rules, not `firebase deploy` without `--only`; preserve pilot2026.

This document is a checkpoint, **not** a claim that the activity website is ready.

## Corrected real event flow (2026-11-05)

**Confirmed teacher requirements:** exactly 3 groups (`group01`–`group03`), 7 students per group, 21 total. **ONE reusable QR per group**, not per-student one-time invitations. First scan auto-signs in anonymously and joins the corresponding group. Same browser/device resumes without scanning again. No student password, logout control, or cross-device identity recovery.

The former per-student one-time invite tool has been **replaced** by a three-group QR provisioning script.

- Provisional live ID: `taipei2026`, separate from `demo2026`, `pilot2026`, and `phase2sandbox`.
- `functions/scripts/create-phase2-three-groups.mjs` defaults to dry-run: **3 groups, 3 shared QR secrets, cap 7 distinct anonymous UIDs per group**. All credentials remain private.
- A group document stores only a SHA-256 hash of its shared QR credential. `joinPhase2Group` checks the group hash, the anonymous UID, other group memberships, and uses a Firestore transaction to reserve a slot atomically. A repeated scan by the same enrolled UID returns the existing student code and does not increase the count.
- `phase2-qr-link.js` clears credentials from the URL fragment before Firebase calls; `phase2-student-bootstrap.js` auto-joins on first scan and resumes the same phone later.
- `group-service.js` only caches identity after the server returns a verified group.
- `scripts/create-phase2-group-qrs.mjs` generates **three private QR PNG images** using the credential file only after approved live provisioning. The images and private credential file are gitignored. Never paste QR secrets into chat or public GitHub.
- `phase2-event-config.js` keeps `enabled:false`; the server also requires an explicit reviewed activity and group allowlist. No online writes/deployments have occurred.
- The teacher dashboard can select `taipei2026`; it still enforces teacher authorization.

### Safe Cloud Shell tests (do not deploy or create Firebase data)
```bash
cd ~/taipei_cultural_adventure
git pull --ff-only origin feature/firebase-sync
node --check functions/phase2-live-entry.js
node --check phase2-student-bootstrap.js
node --test tests/phase2-three-groups-provision.test.mjs tests/phase2-qr-link.test.mjs tests/phase2-student-preview.test.mjs tests/phase2-fast-track-smoke.test.mjs
node functions/scripts/create-phase2-three-groups.mjs --dry-run
node scripts/build-phase2-live-functions.mjs
```

### Mandatory release checks (still pending)
1. Verify CURRENT live Firestore and Storage rules from Firebase Console, especially explicit approved membership and revoked-member restrictions, photo access, teacher access and upload quotas.
2. Emulator-test the actual callable: 7 unique UIDs join each group, the 8th is rejected, repeated QR scan doesn't consume a slot, cross-group rejected, unrelated login denied.
3. Explicitly approve the provisional `taipei2026` ID, create-only group records and private credentials. Never re-run create blindly on failure.
4. Configure reviewed Cloud Function environment variables and deploy only the independently selected Phase2 resources. Ensure it is callable with authorized students.
5. Confirm QR scanning, photos, 5/5 shared completion, final riddle and four-field teacher dashboard on real phones. Only then enable the student frontend and distribute the three QR cards.
6. No blanket `firebase deploy`, no modification of original `pilot2026` data or Functions.

**Caution:** Reusable QR is a bearer credential: anyone with a copy can try joining while slots remain. Keep QR cards within the intended class and use the server cap. No automatic replacement of lost devices was requested.

## Production rules release guard (after merged Emulator tests passed)
- Confirmed 2026-11-05: 7/7 merged real-baseline rules tests passed in Cloud Shell.
- `firebase.phase2-live-rules-deploy.json` references only the LOCAL merged Firestore and Storage rules. It contains no Functions or Hosting target.
- `scripts/preflight-phase2-rules-release.mjs` reads currently deployed Rules and refuses release if hashes differ from the backed-up verified November 4 rules. This does not deploy or modify Firebase.
- Before executing any production deploy, rerun `npm run test:phase2-merged-live-rules` and `node scripts/preflight-phase2-rules-release.mjs` and check all pass. A production rules deploy must target the explicit configuration, and must be independently authorized by the operator.
- Never run a blanket `firebase deploy`; never deploy the draft rules from `firestore.rules` or `storage.rules` by accident.
- Do not distribute QR codes until Functions, Hosting, activity records, teacher permissions and phone checks have been validated.
