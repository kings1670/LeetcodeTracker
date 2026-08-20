"""
generate_daily_report.py

Locates the most recently generated dated Excel file in output/ and copies it
to the reports/ folder with the standardised filename:

    Daily_Performance_YYYY-MM-DD.xlsx

Design rationale:
    main.py uses date.today() on the GitHub Actions runner (UTC timezone).
    This script picks the most recently WRITTEN xlsx file in output/ by
    modification time — not by computing any date independently.
    This eliminates IST/UTC midnight boundary mismatches entirely.

Usage:
    python generate_daily_report.py

Environment variables (optional):
    REPORT_DATE   Force a specific YYYY-MM-DD date (e.g. for testing).
                  When set, looks for output/YYYY-MM-DD.xlsx directly.
"""

import glob
import os
import re
import shutil
import time

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OUTPUT_FOLDER = "output"
REPORTS_FOLDER = "reports"
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}\.xlsx$")

# Accept files written within the last N hours (covers slow pipelines)
MAX_AGE_HOURS = 6


def find_latest_output_file() -> tuple[str, str]:
    """
    Scan output/ for files matching YYYY-MM-DD.xlsx.
    Return the path and date string of the most recently WRITTEN file
    (sorted by modification time, newest first).

    Raises FileNotFoundError with a full directory listing when nothing
    is found, so the GitHub Actions log shows exactly what is present.
    """
    candidates = []
    for path in glob.glob(os.path.join(OUTPUT_FOLDER, "*.xlsx")):
        name = os.path.basename(path)
        if DATE_PATTERN.match(name):
            candidates.append(path)

    if not candidates:
        actual_files = (
            os.listdir(OUTPUT_FOLDER)
            if os.path.exists(OUTPUT_FOLDER)
            else ["<directory missing>"]
        )
        raise FileNotFoundError(
            f"ERROR: No dated Excel file found in '{OUTPUT_FOLDER}/'.\n"
            f"       Expected files matching YYYY-MM-DD.xlsx.\n"
            f"       Ensure main.py ran successfully before this script.\n"
            f"       Actual contents of '{OUTPUT_FOLDER}/': {actual_files}"
        )

    # Sort by modification time descending — newest first
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    latest_path = candidates[0]
    date_str = os.path.basename(latest_path).replace(".xlsx", "")

    mtime = os.path.getmtime(latest_path)
    age_seconds = time.time() - mtime
    age_hours = age_seconds / 3600
    print(f"  Newest xlsx: {latest_path} (age: {age_hours:.1f}h)")

    if age_hours > MAX_AGE_HOURS:
        print(
            f"  WARNING: Newest file is {age_hours:.1f}h old (>{MAX_AGE_HOURS}h).\n"
            f"           main.py may not have run in this workflow job."
        )

    return latest_path, date_str


def generate_daily_report() -> str:
    """
    Locate today's Excel file from output/ and copy it to reports/ as:
        Daily_Performance_YYYY-MM-DD.xlsx

    Returns the absolute path to the created report file.
    """
    report_date = os.getenv("REPORT_DATE")

    if report_date:
        print(f"REPORT_DATE override set: {report_date}")
        source_path = os.path.join(OUTPUT_FOLDER, f"{report_date}.xlsx")
        if not os.path.exists(source_path):
            actual_files = (
                os.listdir(OUTPUT_FOLDER)
                if os.path.exists(OUTPUT_FOLDER)
                else ["<directory missing>"]
            )
            raise FileNotFoundError(
                f"ERROR: Source daily Excel file was not found.\n"
                f"  Expected: {source_path}\n"
                f"  Ensure main.py has run successfully before this script.\n"
                f"  Actual contents of '{OUTPUT_FOLDER}/': {actual_files}"
            )
    else:
        print(f"Scanning '{OUTPUT_FOLDER}/' for the most recently written xlsx...")
        source_path, report_date = find_latest_output_file()
        print(f"Auto-detected report date: {report_date}")

    print(f"Source file : {source_path}")

    # Destination: reports/Daily_Performance_YYYY-MM-DD.xlsx
    os.makedirs(REPORTS_FOLDER, exist_ok=True)
    dest_filename = f"Daily_Performance_{report_date}.xlsx"
    dest_path = os.path.join(REPORTS_FOLDER, dest_filename)

    shutil.copy2(source_path, dest_path)
    print(f"Daily report ready: {dest_path}")
    return dest_path


if __name__ == "__main__":
    report_path = generate_daily_report()
    print(f"\nReport file: {report_path}")
