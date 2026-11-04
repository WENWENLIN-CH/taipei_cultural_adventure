#!/usr/bin/env python3
"""Create exactly one new S03 test invitation; dry-run by default.

python3 scripts/create-s03-invite.py
python3 scripts/create-s03-invite.py --apply

Do not paste invitation codes or access tokens into chats/screenshots.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = "taipei-cultural-adventure"
ACTIVITY = "demo2026"
GROUP = "group01"
STUDENT = "S03"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
PRIVATE_FILE = Path("s03-test-invite-code.txt")


def access_token():
    return subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        check=True, capture_output=True, text=True
    ).stdout.strip()


def firestore(method, url, credential, body=None):
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, method=method,
        headers={
            "Authorization": f"Bearer {credential}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Don't echo response bodies or tokens into screenshots.
        raise RuntimeError(f"Firestore request failed: HTTP {error.code}") from None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="create a single live S03 invite")
    args = parser.parse_args()
    print(f"Target: {PROJECT} / {ACTIVITY}/{GROUP} / {STUDENT}")
    print("This command never deletes existing members, invitations, missions, or photos.")
    if not args.apply:
        print("DRY RUN only; no changes made. Use --apply only when ready.")
        return
    if PRIVATE_FILE.exists():
        raise SystemExit(
            "Private S03 invite file already exists. No changes made; avoid duplicate creation."
        )
    confirmation = input("Type demo2026/group01/S03 to confirm: ").strip()
    if confirmation != f"{ACTIVITY}/{GROUP}/{STUDENT}":
        print("Cancelled. No changes made.")
        return
    credential = access_token()
    group = firestore("GET", f"{BASE}/activities/{ACTIVITY}/groups/{GROUP}", credential)
    display_name = group.get("fields", {}).get("displayName", {}).get("stringValue")
    if display_name != "第一組":
        raise SystemExit("Unexpected group displayName; no changes made.")
    # Keep the code private, and create using a precondition that prevents overwrites.
    code = secrets.token_hex(24)
    document = f"projects/{PROJECT}/databases/(default)/documents/invites/{code}"
    commit = {
        "writes": [{
            "update": {
                "name": document,
                "fields": {
                    "activityId": {"stringValue": ACTIVITY},
                    "groupId": {"stringValue": GROUP},
                    "studentCode": {"stringValue": STUDENT},
                    "claimedBy": {"nullValue": None},
                },
            },
            "currentDocument": {"exists": False},
        }]
    }
    firestore("POST", f"{BASE}:commit", credential, commit)
    # File creation only after successful Firestore transaction; never print code.
    fd = os.open(str(PRIVATE_FILE), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        out.write(code + "\n")
    print("Created exactly one S03 invitation in Firestore.")
    print(f"Code stored privately in {PRIVATE_FILE}; never commit or screenshot its content.")
    print("Do not sign out S02. Open a separate browser profile to join as S03.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError, OSError) as error:
        print(f"Setup stopped: {type(error).__name__}. No further writes attempted.", file=sys.stderr)
        sys.exit(1)
