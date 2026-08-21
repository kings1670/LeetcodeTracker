"""
upload_to_drive.py

Uploads the daily performance Excel report to a Google Drive folder using
OAuth 2.0 user authentication (with refresh token).

Authentication:
    Uses OAuth 2.0 credentials passed via environment variables (GitHub Secrets).
    Expired access tokens are automatically refreshed non-interactively.

Required environment variables:
    GOOGLE_OAUTH_CLIENT_ID       OAuth 2.0 Client ID.
    GOOGLE_OAUTH_CLIENT_SECRET   OAuth 2.0 Client Secret.
    GOOGLE_OAUTH_REFRESH_TOKEN   OAuth 2.0 Refresh Token.
    GOOGLE_DRIVE_FOLDER_ID       Google Drive folder ID to upload into.

Report selection:
    The script automatically finds the latest
    Daily_Performance_YYYY-MM-DD.xlsx file in the reports folder.

Usage (local / GitHub Actions):
    export GOOGLE_OAUTH_CLIENT_ID="your-client-id"
    export GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
    export GOOGLE_OAUTH_REFRESH_TOKEN="your-refresh-token"
    export GOOGLE_DRIVE_FOLDER_ID="your-folder-id"
    python upload_to_drive.py

Duplicate protection:
    Before uploading, the script queries the target folder for any existing
    file with the same name (Daily_Performance_YYYY-MM-DD.xlsx).
    - If found, the existing file is UPDATED (new content replaces old content)
      so there is always exactly one file per date and no "(1)" copies appear.
    - If not found, a fresh file is uploaded.
"""

import os
import re
import sys
from datetime import datetime

# ---------------------------------------------------------------------------
# Third-party imports (google-api-python-client, google-auth)
# ---------------------------------------------------------------------------
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.credentials import Credentials
    import google.auth.transport.requests
except ImportError as exc:
    print(
        "ERROR: Required Google API libraries are not installed.\n"
        "       Run:  pip install google-api-python-client google-auth google-auth-httplib2 google-auth-oauthlib\n"
        f"       Details: {exc}"
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPORTS_FOLDER = "reports"
# Allow drive.file (minimum scope) and drive scope
SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]
MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------



def sanitize_folder_id(raw_folder_id: str) -> str:
    """
    Validate and extract a clean Google Drive Folder ID.
    Rejects '.', empty values, and handles raw URLs if passed by mistake.
    """
    folder_id = raw_folder_id.strip()
    if not folder_id or folder_id == ".":
        print(f"ERROR: Invalid GOOGLE_DRIVE_FOLDER_ID: '{folder_id}'")
        print("       Please provide a valid Google Drive Folder ID.")
        sys.exit(1)

    # Handle full Google Drive URLs like https://drive.google.com/drive/folders/<ID>
    if "drive.google.com" in folder_id or "folders/" in folder_id:
        match = re.search(r"folders/([a-zA-Z0-9_-]+)", folder_id)
        if match:
            extracted_id = match.group(1)
            return extracted_id
        else:
            print("ERROR: Could not extract folder ID from the provided Google Drive URL.")
            sys.exit(1)

    return folder_id


def load_oauth_credentials(client_id: str, client_secret: str, refresh_token: str) -> Credentials:
    """
    Construct OAuth credentials and automatically refresh the access token.
    Works non-interactively without requiring browser login.
    """
    try:
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES,
        )
        request = google.auth.transport.requests.Request()
        creds.refresh(request)
        return creds
    except Exception as exc:
        print("ERROR: Google Drive OAuth authentication failed.")
        print("       Unable to refresh access token using the provided refresh token.")
        print(f"       Details: {exc}")
        sys.exit(1)


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
    missing_vars = []

    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    if not client_id:
        missing_vars.append("GOOGLE_OAUTH_CLIENT_ID")

    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    if not client_secret:
        missing_vars.append("GOOGLE_OAUTH_CLIENT_SECRET")

    refresh_token = os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN")
    if not refresh_token:
        missing_vars.append("GOOGLE_OAUTH_REFRESH_TOKEN")

    raw_folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not raw_folder_id:
        missing_vars.append("GOOGLE_DRIVE_FOLDER_ID")

    if missing_vars:
        print("\nERROR: Required Google Drive OAuth environment variables are missing:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease configure these as environment variables or GitHub Actions secrets.")
        sys.exit(1)

    folder_id = sanitize_folder_id(raw_folder_id)


    # ------------------------------------------------------------------
    # 2. Locate the latest daily performance report
    # ------------------------------------------------------------------
    print("\nLooking for the latest daily performance report...")

    if not os.path.isdir(REPORTS_FOLDER):
        print(f"\nERROR: Reports folder was not found.")
        print(f"       Expected folder: {REPORTS_FOLDER}")
        print("       Ensure generate_daily_report.py has run successfully first.")
        sys.exit(1)

    # Find all Daily_Performance_YYYY-MM-DD.xlsx files
    report_files = []

    for filename in os.listdir(REPORTS_FOLDER):
        match = re.fullmatch(
            r"Daily_Performance_(\d{4}-\d{2}-\d{2})\.xlsx",
            filename
        )

        if match:
            try:
                report_date = datetime.strptime(
                    match.group(1),
                    "%Y-%m-%d"
                ).date()

                report_files.append((report_date, filename))

            except ValueError:
                continue

    if not report_files:
        print("\nERROR: No daily performance reports were found.")
        print("       Expected files matching:")
        print("       reports/Daily_Performance_YYYY-MM-DD.xlsx")
        print("       Ensure generate_daily_report.py has run successfully first.")
        sys.exit(1)

    # Select the report with the newest date
    report_date, report_filename = max(
        report_files,
        key=lambda item: item[0]
    )

    report_path = os.path.join(REPORTS_FOLDER, report_filename)

    print("\nLatest daily performance report found:")
    print(f"reports/{report_filename}")
    print(f"Report date: {report_date}")

    if not os.path.exists(report_path):
        print(f"\nERROR: Selected report does not exist:")
        print(f"       {report_path}")
        sys.exit(1)

    print("\nFound latest daily report.")


    # ------------------------------------------------------------------
    # 3. Authenticate
    # ------------------------------------------------------------------
    print("\nAuthenticating with Google Drive...")
    creds = load_oauth_credentials(client_id, client_secret, refresh_token)

    try:
        service = build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception as exc:
        print(f"ERROR: Unable to create Google Drive service.\n  Details: {exc}")
        sys.exit(1)

    print("Authentication successful.")

    # ------------------------------------------------------------------
    # 4. Check for existing file (duplicate protection)
    # ------------------------------------------------------------------
    print("\nChecking Google Drive folder...")

    existing_id = find_existing_file(service, folder_id, report_filename)

    # ------------------------------------------------------------------
    # 5. Upload or update
    # ------------------------------------------------------------------
    try:
        if existing_id:
            print("\nExisting file found. Updating file...")
            file_id = update_file(service, existing_id, report_path)
        else:
            print("\nNo existing file found. Uploading new file...")
            file_id = upload_file(service, report_path, report_filename, folder_id)

    except Exception as exc:
        print(f"\nERROR: Unable to upload daily report.")
        print(f"  Details: {exc}")
        sys.exit(1)

    print("=" * 60)
    print("Google Drive upload completed successfully")
    print("=" * 60)
    print(f"\nFile:\n{report_filename}")


if __name__ == "__main__":
    main()
