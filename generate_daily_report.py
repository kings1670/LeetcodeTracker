"""
generate_daily_report.py

Locates the most recently generated dated Excel file in output/ and copies it
to the reports/ folder with the standardised filename:

    Daily_Performance_YYYY-MM-DD.xlsx

Why "most recent file" instead of computing today's date:
    main.py uses date.today() on the GitHub Actions runner (UTC).
    This script may run after midnight IST, causing a date mismatch if an
    independent IST date is computed.  Using the most recently modified xlsx
    avoids this entirely.

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
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OUTPUT_FOLDER = "output"
REPORTS_FOLDER = "reports"
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}\.xlsx$")


def find_latest_output_file() -> tuple[str, str]:
    """
    Scan output/ for files matching YYYY-MM-DD.xlsx and return the path and
    date string of the most recently WRITTEN one (by modification time).

    Sorting by mtime rather than filename avoids a date-boundary mismatch:
    main.py uses UTC date.today() on the runner, but if this script runs
    after midnight IST the two dates can differ by one day.

    Returns:
        (file_path, date_str)  e.g. ('output/2026-08-20.xlsx', '2026-08-20')

    Raises:
        FileNotFoundError: If no dated xlsx file exists in output/.
    """
    candidates = []
    for path in glob.glob(os.path.join(OUTPUT_FOLDER, "*.xlsx")):
        name = os.path.basename(path)
        if DATE_PATTERN.match(name):
            candidates.append(path)

    if not candidates:
        actual_files = (
            os.listdir(OUTPUT_FOLDER) if os.path.exists(OUTPUT_FOLDER) else ["<directory missing>"]
        )
        raise FileNotFoundError(
            f"ERROR: No dated Excel file found in {OUTPUT_FOLDER}/.\n"
            f"       Files matching YYYY-MM-DD.xlsx are expected.\n"
            f"       Ensure main.py has run successfully before this script.\n"
            f"       Actual files in {OUTPUT_FOLDER}/: {actual_files}"
        )

    # Sort by modification time — picks up whichever file main.py just wrote,
    # regardless of whether the UTC date matches the IST date.
    latest_path = max(candidates, key=lambda p: os.path.getmtime(p))
    date_str = os.path.basename(latest_path).replace(".xlsx", "")
    return latest_path, date_str


def generate_daily_report() -> str:
    """
    Locate the daily Excel file from output/ and copy it to reports/ with the
    canonical filename Daily_Performance_YYYY-MM-DD.xlsx.

    Returns:
        Absolute path to the generated report file.
    """
    # Allow an explicit override for testing / backfills
    report_date = os.getenv("REPORT_DATE")

    if report_date:
        print(f"REPORT_DATE override: {report_date}")
        source_path = os.path.join(OUTPUT_FOLDER, f"{report_date}.xlsx")
        if not os.path.exists(source_path):
            raise FileNotFoundError(
                f"ERROR: Source daily Excel file was not found.\n"
                f"  Expected: {source_path}\n"
                f"  Ensure main.py has run successfully before this script."
            )
    else:
        # Auto-detect: use the most recently generated file in output/
        source_path, report_date = find_latest_output_file()
        print(f"Auto-detected daily report date: {report_date}")

    print(f"Source file: {source_path}")

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
