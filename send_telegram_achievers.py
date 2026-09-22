#!/usr/bin/env python3
"""
send_telegram_achievers.py

Automated Telegram notification script for Top-10 LeetCode Achievers of the Day.
ADDITIVE feature for LeetcodeTracker.

Usage:
    python send_telegram_achievers.py [--dry-run]
"""

import os
import sys
import json
import glob
import html
import argparse
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta
import openpyxl
import re

# Ensure UTF-8 output formatting for Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Configuration Constants
# ---------------------------------------------------------------------------
TOP_N = 10

# Explicit IST Timezone (+05:30)
IST = timezone(timedelta(hours=5, minutes=30))

# Rank display emojis (1-indexed mapping)
RANK_EMOJIS = [
    "🏆",  # Rank 1
    "🥇",  # Rank 2
    "🥈",  # Rank 3
    "🥉",  # Rank 4
    "🌟",  # Rank 5
    "⚡",  # Rank 6
    "⚡",  # Rank 7
    "🌟",  # Rank 8
    "✨",  # Rank 9
    "✨",  # Rank 10
]
FALLBACK_EMOJI = "✨"

JSON_DATA_PATH = os.path.join("output", "leetcode-data.json")
FALLBACK_JSON_PATH = os.path.join("leetcode-dashboard", "public", "data", "leetcode-data.json")
SENT_LOG_PATH = os.path.join("data", "telegram_sent_log.json")
OUTPUT_FOLDER = "output"
REPORTS_FOLDER = "reports"

REQUEST_TIMEOUT = 15  # seconds


# ---------------------------------------------------------------------------
# Core Logic Functions
# ---------------------------------------------------------------------------

def get_rank_emoji(index: int) -> str:
    """Return presentation emoji for 0-indexed position in leaderboard."""
    if 0 <= index < len(RANK_EMOJIS):
        return RANK_EMOJIS[index]
    return FALLBACK_EMOJI


def load_daily_performance_data() -> tuple[list[dict], str]:
    """
    Load authoritative daily student performance data.

    Returns:
        tuple of (students_list, date_str YYYY-MM-DD)
    """
    # 1. Try loading from output/leetcode-data.json
    for path in [JSON_DATA_PATH, FALLBACK_JSON_PATH]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                latest_date = data.get("latestDate", "")
                students = data.get("students", [])
                if students and latest_date:
                    print(f"Loaded {len(students)} student records from '{path}' (Date: {latest_date})")
                    return students, latest_date
            except Exception as e:
                print(f"Warning: Failed loading JSON from '{path}': {e}")

    # 2. Fallback to latest Excel report
    excel_file = find_latest_excel_file()
    if excel_file:
        print(f"Fallback: Reading performance data from Excel file '{excel_file}'")
        students, date_str = parse_excel_report(excel_file)
        if students:
            return students, date_str

    raise FileNotFoundError("ERROR: Could not locate authoritative performance data (JSON or Excel).")


def find_latest_excel_file() -> str | None:
    """Scan output/ and reports/ for the most recently modified dated Excel file."""
    candidates = []
    for folder in [OUTPUT_FOLDER, REPORTS_FOLDER]:
        if os.path.exists(folder):
            for path in glob.glob(os.path.join(folder, "*.xlsx")):
                candidates.append(path)

    if not candidates:
        return None

    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def parse_excel_report(file_path: str) -> tuple[list[dict], str]:
    """Parse latest sheet from Excel workbook into standard student dicts."""
    wb = openpyxl.load_workbook(file_path, data_only=True)
    dated_sheets = []
    for sheet_name in wb.sheetnames:
        match = re.match(r"^(\d{4}-\d{2}-\d{2})", sheet_name)
        if match:
            dated_sheets.append((match.group(1), sheet_name))

    if not dated_sheets:
        date_str = datetime.now(IST).strftime("%Y-%m-%d")
        sheet_name = wb.sheetnames[-1]
    else:
        dated_sheets.sort()
        date_str, sheet_name = dated_sheets[-1]

    sheet = wb[sheet_name]
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return [], date_str

    headers = [str(h).strip().upper() if h else "" for h in rows[0]]
    name_col = -1
    perf_col = -1

    for idx, h in enumerate(headers):
        if "NAME" in h and name_col == -1:
            name_col = idx
        elif "PERFORMANCE" in h:
            perf_col = idx

    students = []
    for row in rows[1:]:
        if not row or name_col >= len(row) or not row[name_col]:
            continue
        name = str(row[name_col]).strip()
        imp = 0
        if perf_col < len(row) and row[perf_col]:
            perf_str = str(row[perf_col])
            match = re.search(r"\((\+?\-?\d+)\)", perf_str)
            if match:
                imp = int(match.group(1))

        students.append({
            "name": name,
            "improvement": imp
        })

    return students, date_str


def get_eligible_achievers(students: list[dict], top_n: int = TOP_N) -> list[dict]:
    """
    Filter for improvement > 0, sort descending by improvement with secondary
    alphabetical tie-breaker on student name, and select top_n.
    """
    # Filter improvement > 0
    eligible = [s for s in students if s.get("improvement", 0) > 0]

    # Deterministic sorting: improvement DESC, name ASC (case-insensitive)
    eligible.sort(key=lambda s: (-s.get("improvement", 0), s.get("name", "").lower()))

    return eligible[:top_n]


def format_reporting_date(date_str: str) -> str:
    """Format YYYY-MM-DD date string into 'DD Month YYYY' in IST."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%d %B %Y").lstrip("0")
    except ValueError:
        now_ist = datetime.now(IST)
        return now_ist.strftime("%d %B %Y").lstrip("0")


def generate_telegram_message(
    achievers: list[dict],
    date_str: str,
    top_n: int = TOP_N
) -> str:
    """
    Generate Telegram-safe HTML formatted message for daily top achievers.
    """
    date_formatted = format_reporting_date(date_str)

    if not achievers:
        return (
            "<b>📊 LeetCode Daily Update</b>\n"
            f"📅 {date_formatted}\n\n"
            "No new problems were recorded today.\n\n"
            "Let's aim for a stronger performance tomorrow! 💪🚀"
        )

    lines = [
        "<b>🚀 LeetCode Achievers of the Day! 🚀</b>",
        f"📅 {date_formatted}",
        ""
    ]

    for idx, student in enumerate(achievers):
        emoji = get_rank_emoji(idx)
        raw_name = student.get("name", "Student")
        safe_name = html.escape(raw_name)
        imp = student.get("improvement", 0)
        lines.append(f"{emoji} {safe_name} (+{imp})")

    count = len(achievers)
    lines.extend([
        "",
        f"💡 <b>Fantastic effort by our Top {count} Achievers!</b>",
        "",
        "Stay consistent, keep learning, and let today's progress inspire an even bigger achievement tomorrow! 🚀💻🔥"
    ])

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# State Logging (Duplicate Prevention)
# ---------------------------------------------------------------------------

def is_already_sent(date_str: str) -> bool:
    """Check if notification for given date was already sent."""
    if not os.path.exists(SENT_LOG_PATH):
        return False
    try:
        with open(SENT_LOG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        sent_dates = data.get("sent_dates", {})
        return date_str in sent_dates
    except Exception as e:
        print(f"Warning: Failed reading sent log '{SENT_LOG_PATH}': {e}")
        return False


def record_sent_date(date_str: str):
    """Record that notification for date_str has been sent successfully."""
    data = {"sent_dates": {}}
    if os.path.exists(SENT_LOG_PATH):
        try:
            with open(SENT_LOG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass

    if "sent_dates" not in data:
        data["sent_dates"] = {}

    data["sent_dates"][date_str] = datetime.now(IST).isoformat()

    os.makedirs(os.path.dirname(SENT_LOG_PATH), exist_ok=True)
    try:
        with open(SENT_LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Recorded Telegram notification sent log for date '{date_str}'.")
    except Exception as e:
        print(f"Warning: Failed to write sent log: {e}")


# ---------------------------------------------------------------------------
# Telegram API Sender
# ---------------------------------------------------------------------------

def send_telegram_api(message_text: str, bot_token: str, chat_id: str) -> bool:
    """
    Send message using Telegram Bot API sendMessage.
    Returns True if successful, False otherwise.
    """
    if not bot_token or not chat_id:
        print("ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variable is missing.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            resp_bytes = resp.read()
            resp_json = json.loads(resp_bytes.decode("utf-8"))
            if resp_json.get("ok"):
                print("✓ Telegram notification sent successfully!")
                return True
            else:
                desc = resp_json.get("description", "Unknown error")
                print(f"ERROR: Telegram API returned failure: {desc}")
                return False
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"ERROR: Telegram HTTP Error {e.code}: {e.reason}\nDetails: {err_body}")
        return False
    except urllib.error.URLError as e:
        print(f"ERROR: Network connection failure to Telegram API: {e.reason}")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected exception sending Telegram message: {e}")
        return False


# ---------------------------------------------------------------------------
# Main Execution Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Send Daily Top-10 LeetCode Achievers Telegram Notification.")
    parser.add_argument("--dry-run", action="store_true", help="Perform calculation and display message without contacting Telegram API.")
    parser.add_argument("--force", action="store_true", help="Bypass duplicate message check.")
    args = parser.parse_args()

    # Environment variables
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    env_dry_run = os.environ.get("TELEGRAM_DRY_RUN", "").lower() in ("true", "1", "yes")
    env_force = os.environ.get("FORCE_TELEGRAM_SEND", "").lower() in ("true", "1", "yes")

    is_dry_run = args.dry_run or env_dry_run
    is_force = args.force or env_force

    print("==================================================")
    print("      LEETCODE TOP ACHIEVERS TELEGRAM NOTIFIER    ")
    print("==================================================")
    print(f"Configuration : TOP_N = {TOP_N}")
    print(f"Execution Mode: {'DRY RUN' if is_dry_run else 'LIVE PRODUCTION'}")

    try:
        students, date_str = load_daily_performance_data()
    except Exception as e:
        print(f"CRITICAL: {e}")
        # Failure to load data must not crash caller pipeline
        sys.exit(0)

    # Check for duplicate sending
    if not is_dry_run and not is_force:
        if is_already_sent(date_str):
            print(f"[Telegram] Notification for date '{date_str}' was already sent previously. Skipping duplicate notification.")
            sys.exit(0)

    # Filter and rank achievers
    achievers = get_eligible_achievers(students, top_n=TOP_N)
    message_text = generate_telegram_message(achievers, date_str, top_n=TOP_N)

    print("\n---------------- GENERATED MESSAGE ----------------")
    print(message_text)
    print("---------------------------------------------------\n")

    if is_dry_run:
        print("✓ Dry run complete. Telegram API call skipped.")
        return

    if not bot_token or not chat_id:
        print("WARNING: Credentials missing. Skipping Telegram API call.")
        return

    # Send message
    success = send_telegram_api(message_text, bot_token, chat_id)
    if success:
        record_sent_date(date_str)
    else:
        print("WARNING: Telegram sending failed, but workflow execution continues safely.")


if __name__ == "__main__":
    main()
