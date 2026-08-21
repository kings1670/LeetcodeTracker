"""
authorize_drive.py

One-time local setup script to authorize Google Drive access for a personal account
and obtain a refresh token for automated GitHub Actions uploads.

DO NOT RUN THIS SCRIPT IN GITHUB ACTIONS.
Run this script locally on your computer.

Usage:
    Option A (using credentials.json file):
        1. Place your OAuth 2.0 Client ID JSON file (downloaded from Google Cloud Console)
           in this folder and rename it to 'credentials.json' (or keep 'client_secret_*.json').
        2. Run: python authorize_drive.py

    Option B (using environment variables):
        1. export GOOGLE_OAUTH_CLIENT_ID="your-client-id"
           export GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
        2. Run: python authorize_drive.py
"""

import glob
import os
import sys

# ---------------------------------------------------------------------------
# Third-party imports (google-auth-oauthlib)
# ---------------------------------------------------------------------------
try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError as exc:
    print(
        "ERROR: Required Google OAuth library is not installed.\n"
        "       Run: pip install google-auth-oauthlib google-api-python-client google-auth\n"
        f"       Details: {exc}"
    )
    sys.exit(1)

# Minimum required Google Drive scope for file upload & management
SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def get_client_flow() -> InstalledAppFlow:
    """
    Locate OAuth client credentials either from local JSON files or environment
    variables and return an initialized InstalledAppFlow.
    """
    # 1. Check environment variables first
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    if client_id and client_secret:
        print("Loaded OAuth Client credentials from environment variables.")
        client_config = {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        }
        return InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)

    # 2. Check for local credentials.json or client_secret*.json
    candidate_files = []
    if os.path.exists("credentials.json"):
        candidate_files.append("credentials.json")
    candidate_files.extend(glob.glob("client_secret*.json"))

    if candidate_files:
        creds_file = candidate_files[0]
        print(f"Loaded OAuth Client credentials from local file: {creds_file}")
        return InstalledAppFlow.from_client_secrets_file(creds_file, scopes=SCOPES)

    # 3. Neither found — output helpful instructions
    print("ERROR: Could not find Google OAuth Client credentials.")
    print("\nPlease provide client credentials using ONE of the following options:")
    print("  Option A: Save your Google Cloud OAuth Client JSON file as 'credentials.json' in this directory.")
    print("  Option B: Set environment variables:")
    print("            GOOGLE_OAUTH_CLIENT_ID")
    print("            GOOGLE_OAUTH_CLIENT_SECRET")
    sys.exit(1)


def main():
    print("=" * 60)
    print("Google Drive OAuth Authorization (One-time Setup)")
    print("=" * 60)

    flow = get_client_flow()

    print("\nStarting local authorization flow...")
    print("Your browser should open automatically to sign in to your Google Account.")
    print("If it does not open, follow the URL displayed in the console.")

    try:
        # access_type='offline' is required to receive a refresh token.
        # prompt='consent' forces the consent screen so a new refresh token is always issued.
        creds = flow.run_local_server(
            port=0,
            access_type="offline",
            prompt="consent",
            success_message="Authorization complete! You may close this browser tab.",
        )
    except Exception as exc:
        print(f"\nERROR: Authorization failed.\n  Details: {exc}")
        sys.exit(1)

    refresh_token = creds.refresh_token
    if not refresh_token:
        print("\nERROR: No refresh token was returned by Google.")
        print("       Ensure you selected 'access_type=offline' and approved permissions.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Authorization Successful!")
    print("=" * 60)
    print("\nYour OAuth Refresh Token has been generated.")
    print("\nCopy the Refresh Token below and save it as a GitHub Secret:\n")
    print("-" * 60)
    print(refresh_token)
    print("-" * 60)
    print("\nGitHub Secret Configuration Checklist:")
    print("  1. Go to your GitHub repository: Settings > Secrets and variables > Actions")
    print("  2. Add the following secrets:")
    print("     - GOOGLE_OAUTH_CLIENT_ID      : Your OAuth Client ID")
    print("     - GOOGLE_OAUTH_CLIENT_SECRET  : Your OAuth Client Secret")
    print("     - GOOGLE_OAUTH_REFRESH_TOKEN  : The token printed above")
    print("     - GOOGLE_DRIVE_FOLDER_ID      : Your Google Drive Folder ID")
    print("============================================================\n")


if __name__ == "__main__":
    main()
