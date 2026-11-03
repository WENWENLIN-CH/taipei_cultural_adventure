#!/usr/bin/env python3
"""Provision four test invitation documents through Firestore REST API using Cloud Shell credentials.
Usage:
  python3 scripts/create-test-invites.py          # preview only, no writes
  python3 scripts/create-test-invites.py --apply  # writes four docs after confirmation

This script must run only from an administrator's trusted environment.
It never stores invite codes in GitHub.
"""
import argparse
import json
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "taipei-cultural-adventure"
ACTIVITY = "demo2026"
GROUP = "group01"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

def access_token():
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip()

def request(method, url, token, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        print(f"Firestore HTTP {error.code}: {error.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        raise SystemExit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Create test invitations in live Firestore")
    args = parser.parse_args()
    print(f"Target project: {PROJECT}\nTest group: {ACTIVITY}/{GROUP}")
    print("This script provisions exactly four TEST invitations; no real students or photographs.")
    if not args.apply:
        print("DRY RUN. No changes made. Use --apply only when ready.")
        return

    typed = input("Type demo2026/group01 to confirm live creation: ").strip()
    if typed != f"{ACTIVITY}/{GROUP}":
        print("Cancelled. No changes made.")
        return

    token = access_token()
    group_doc = request("GET", f"{BASE}/activities/{ACTIVITY}/groups/{GROUP}", token)
    if group_doc.get("fields", {}).get("displayName", {}).get("stringValue") != "第一組":
        raise SystemExit("Group displayName does not match 第一組. Aborting.")
    from pathlib import Path
    p = Path("test-invite-codes.txt")
    if p.exists():
        raise SystemExit("test-invite-codes.txt already exists. Avoid creating duplicate invitations.")
    invitation_pairs = [(f"S{i:02}", secrets.token_hex(24)) for i in range(1, 5)]
    writes = []
    for student, code in invitation_pairs:
        writes.append({
            "update": {
                "name": f"projects/{PROJECT}/databases/(default)/documents/invites/{code}",
                "fields": {
                    "activityId": {"stringValue": ACTIVITY},
                    "groupId": {"stringValue": GROUP},
                    "studentCode": {"stringValue": student},
                    "claimedBy": {"nullValue": None}
                }
            },
            "currentDocument": {"exists": False}
        })
    request("POST", f"{BASE}:commit", token, {"writes": writes})

    # Keep a private copy in the Cloud Shell workspace; do not upload or screenshot it.
    import os
    fd = os.open(str(p), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf8") as out:
        for student, code in invitation_pairs:
            out.write(f"{student}: {code}\n")
    print("Four invitation documents created in Firestore.")
    print("Codes saved locally to test-invite-codes.txt (private; not committed).")
    print("Do NOT share this file or its contents in screenshots or chats.")
    print("Reminder: clients are still blocked by current live Firestore rules.")

if __name__ == "__main__":
    main()
