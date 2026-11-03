# Photo upload retry safety checkpoint

This change implements and unit-tests immutable photo slot recovery on branch `feature/firebase-sync`.

## Steps
```bash
cd ~/taipei_cultural_adventure
git pull origin feature/firebase-sync
npm run test:photo-retry
npm run test:cloud-preview
```

The photo retry policy permits reuse only if an existing Storage object has the same SHA-256 metadata, byte size, and JPEG content type as the current uploaded blob. It does not overwrite or delete Storage objects. A missing file allows a normal upload. A permission, network, or metadata mismatch must not trigger a blind overwrite. Changes are only in the development branch.

## Known limitations before enabling real student submissions

- Existing legacy S02 demo photo lacks SHA-256 metadata. It cannot be safely resumed as identical and may need a separate teacher-mediated test cleanup.
- This check is a pure policy unit test. It is not yet an end-to-end network interruption test against live Firebase.
- Original mission answers and images are stored on device in localStorage. If lost, they may not be recoverable automatically. The browser's original local cache needs robust quota and error handling before live usage.
- Real same-group multi-user takeover/retake, cloud upload quotas, and orphaned photo cleanup remain outstanding.
- Firebase Function is still **not deployed**. Cloud island preview submission button is deliberately disabled.
- Once tests pass, a new *Hosting preview* may be deployed. Do not use `firebase deploy --only hosting` or deploy Functions from this checkpoint.
