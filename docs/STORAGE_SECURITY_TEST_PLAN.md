# Cloud Storage security draft — pre-deployment checklist

Current Firebase Storage production rules MUST remain `allow read, write: if false` until these tests pass and photo submission integrity is completed.

## Current draft
- `storage.rules`: only signed-in members of the given group may read specific image objects; explicitly authorized teachers may read; no listing.
- Create-only JPEG with max 1 MiB; object path includes activity, group, mission, uploading UID and a fixed permitted answer key filename, such as `photo1.jpg`.
- No overwriting/deleting by ordinary clients. Administrator handles cleanup after the event.
- Membership/teacher access is backed by the **default** Firestore database. Cross-service Rules lookups count toward billing.
- The current test does **not** guarantee that a file's binary content is a genuine JPEG: MIME metadata can be forged.

## Local emulator tests (no live deployment)
```bash
git pull origin feature/firebase-sync
npm run test:storage
```
This starts Firestore and Storage emulators and runs the permission suite against fake users. Some PERMISSION_DENIED lines are expected in intentional denial tests.

## Future safety gates
1. Ensure no object read is possible outside permitted memberships/teacher identities.
2. Prevent writes to an already completed mission, and further limit unwanted uploads; one authenticated member can now upload only one object per answer key (create-only), but multiple enrolled members can each upload one copy of the slot. Limit issued invitation codes and consider stronger per-group reservations or server-side upload tokens for real activities.
3. Use content inspection or a trusted backend to confirm real images, exact cloud object existence and ownership, rather than relying only on untrusted photoPaths.
4. Tie each successful group submission atomically to five-task completion logic and an authenticated teacher view, without letting one member submit twice or claim paths uploaded by outsiders.
5. Ensure saved image references are not unrestricted public download URLs. Prefer authenticated SDK reads with security rules. Avoid distributing long-lived download tokens.
6. Check regional Storage charges and create a cloud billing budget warning; a budget warning is not a spend cap.
7. Do not deploy these draft rules until emulator results are inspected.

The prior mocked Firestore first-mission completed record is not evidence of a real submitted photo.
