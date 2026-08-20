"""
upload_to_drive.py

Uploads the daily performance Excel report to a Google Drive folder.

Authentication:
    Uses a Google Cloud Service Account whose JSON key is passed via the
    environment variable GOOGLE_SERVICE_ACCOUNT_JSON.  The variable must
    contain the full JSON string (not a file path).

Required environment variables:
    GOOGLE_SERVICE_ACCOUNT_JSON   Full JSON string of the service-account key.
    GOOGLE_DRIVE_FOLDER_ID        Google Drive folder ID to upload into.

Optional environment variables:
    REPORT_DATE   Date in YYYY-MM-DD format (default: today IST).
                  Used to locate the report file.

Usage (local with credentials):
    export GOOGLE_SERVICE_ACCOUNT_JSON='{ ... json content ... }'
    export GOOGLE_DRIVE_FOLDER_ID='1AbCdEfGhIjKlMnOpQrStUvWxYz'
    python upload_to_drive.py

Usage (GitHub Actions):
    Secrets GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID are passed
    as environment variables by the workflow step.

Setup instructions (must be performed ONCE manually by the repository owner):
    1. Go to https://console.cloud.google.com/
    2. Create a new project (or select an existing one).
    3. Enable the Google Drive API for the project.
    4. Navigate to IAM & Admin > Service Accounts.
    5. Create a new service account.
    6. Generate a JSON key for the service account and download it.
    7. Copy the ENTIRE contents of the JSON key file.
    8. In GitHub: Settings > Secrets and variables > Actions > New repository secret
       - Name:  GOOGLE_SERVICE_ACCOUNT_JSON
       - Value: <paste the entire JSON content>
    9. Create or select the target Google Drive folder.
   10. Share that folder with the service account's email address
       (found inside the JSON under "client_email") with Editor permission.
   11. Copy the folder ID from the Drive URL:
       https://drive.google.com/drive/folders/<FOLDER_ID>
   12. In GitHub: Settings > Secrets and variables > Actions > New repository secret
       - Name:  GOOGLE_DRIVE_FOLDER_ID
       - Value: <paste the folder ID>

Duplicate protection:
    Before uploading, the script queries the target folder for any existing
    file with the same name (Daily_Performance_YYYY-MM-DD.xlsx).
    - If found, the existing file is UPDATED (new content replaces old content)
      so there is always exactly one file per date and no "(1)" copies appear.
    - If not found, a fresh file is uploaded.
"""

import json
import os
import sys
import tempfile
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------------------
# Third-party imports (google-api-python-client, google-auth)
# ---------------------------------------------------------------------------
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2 import service_account
except ImportError as exc:
    print(
        "ERROR: Required Google API libraries are not installed.\n"
        "       Run:  pip install google-api-python-client google-auth google-auth-httplib2\n"
        f"       Details: {exc}"
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPORTS_FOLDER = "reports"
SCOPES = ["https://www.googleapis.com/auth/drive"]
MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_ist_date() -> str:
    """Return today's date in Asia/Kolkata (IST = UTC+5:30) as YYYY-MM-DD."""
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = datetime.now(timezone.utc) + ist_offset
    return now_ist.strftime("%Y-%m-%d")


def load_credentials(service_account_json_str: str):
    """
    Parse the service-account JSON string and return Google credentials.
    The temporary file is never written to disk; credentials are built from
    the parsed dict directly.
    """
    try:
        info = json.loads(service_account_json_str)
    except json.JSONDecodeError as exc:
        print(f"ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.\n  Details: {exc}")
        sys.exit(1)

    try:
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    except Exception as exc:
        print(f"ERROR: Google Drive authentication failed.\n  Details: {exc}")
        sys.exit(1)

    return creds


def find_existing_file(service, folder_id: str, filename: str) -> str | None:
    """
    Search the target Drive folder for a file with the given name.
    Returns the file ID if found, else None.
    """
    query = (
        f"name = '{filename}' "
        f"and '{folder_id}' in parents "
        f"and trashed = false"
    )
    response = service.files().list(
        q=query,
        spaces="drive",
        fields="files(id, name)",
    ).execute()

    files = response.get("files", [])
    if files:
        return files[0]["id"]
    return None


def upload_file(service, local_path: str, filename: str, folder_id: str) -> str:
    """
    Upload a new file to Drive and return its file ID.
    """
    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }
    media = MediaFileUpload(local_path, mimetype=MIME_XLSX, resumable=True)
    uploaded = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id")
        .execute()
    )
    return uploaded.get("id")


def update_file(service, file_id: str, local_path: str) -> str:
    """
    Replace the content of an existing Drive file and return its file ID.
    """
    media = MediaFileUpload(local_path, mimetype=MIME_XLSX, resumable=True)
    updated = (
        service.files()
        .update(fileId=file_id, media_body=media, fields="id")
        .execute()
    )
    return updated.get("id")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Google Drive upload started")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 1. Validate environment variables
    # ------------------------------------------------------------------
    folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        print("ERROR: GOOGLE_DRIVE_FOLDER_ID is not configured.")
        print("       Set it as an environment variable or GitHub Actions secret.")
        sys.exit(1)

    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
        print("ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is not configured.")
        print("       Set it as an environment variable or GitHub Actions secret.")
        sys.exit(1)

    # ------------------------------------------------------------------
    # 2. Locate daily report file
    # ------------------------------------------------------------------
    report_date = os.getenv("REPORT_DATE") or get_ist_date()
    report_filename = f"Daily_Performance_{report_date}.xlsx"
    report_path = os.path.join(REPORTS_FOLDER, report_filename)

    print(f"\nLooking for daily report:")
    print(f"  {report_path}")

    if not os.path.exists(report_path):
        print(f"\nERROR: Daily performance report was not found.")
        print(f"       Expected: {report_path}")
        print(f"       Ensure generate_daily_report.py has run successfully first.")
        sys.exit(1)

    print(f"\nFound daily report:")
    print(f"  {report_filename}")

    # ------------------------------------------------------------------
    # 3. Authenticate
    # ------------------------------------------------------------------
    print("\nAuthenticating with Google Drive...")
    creds = load_credentials(sa_json)

    try:
        service = build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception as exc:
        print(f"ERROR: Unable to create Google Drive service.\n  Details: {exc}")
        sys.exit(1)

    print("  Authentication successful.")

    # ------------------------------------------------------------------
    # 4. Check for existing file (duplicate protection)
    # ------------------------------------------------------------------
    print(f"\nChecking Google Drive folder for existing file: {report_filename} ...")

    existing_id = find_existing_file(service, folder_id, report_filename)

    # ------------------------------------------------------------------
    # 5. Upload or update
    # ------------------------------------------------------------------
    try:
        if existing_id:
            print(f"  File already exists (ID: {existing_id}). Updating content...")
            file_id = update_file(service, existing_id, report_path)
            print(f"\nReport updated successfully.")
        else:
            print("  No existing file found. Uploading new file...")
            file_id = upload_file(service, report_path, report_filename, folder_id)
            print(f"\nReport uploaded successfully.")

        print(f"Google Drive File ID: {file_id}")

    except Exception as exc:
        print(f"\nERROR: Unable to upload daily report.")
        print(f"  Details: {exc}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Google Drive upload complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
