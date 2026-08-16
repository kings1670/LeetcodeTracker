#!/usr/bin/env python3
"""
analyze_activity.py
Phase 4 implementation for CSD LeetCode Performance Tracker.

Analyzes submission events from data/submissions/*.json and problem metadata
from data/problem-cache.json to compute activity pattern indicators in explicit IST (+05:30).
Outputs data/activity-analysis.json without modifying existing tracker or dashboard files.
"""

import os
import sys
import json
import glob
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# Explicit IST (+05:30) Timezone
IST = timezone(timedelta(hours=5, minutes=30))

DATA_DIR = "data"
SUBMISSIONS_DIR = os.path.join(DATA_DIR, "submissions")
CACHE_FILE = os.path.join(DATA_DIR, "problem-cache.json")
STUDENTS_JSON = os.path.join("leetcode-dashboard", "public", "data", "leetcode-data.json")
OUTPUT_ANALYSIS_FILE = os.path.join(DATA_DIR, "activity-analysis.json")

DISCLAIMER = (
    "These indicators describe observable submission activity patterns only. "
    "They do not establish whether the work was independently completed or "
    "whether any academic-integrity violation occurred."
)

def load_problem_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load problem cache ({e}).")
    return {}

def load_student_metadata():
    students_map = {}
    if os.path.exists(STUDENTS_JSON):
        try:
            with open(STUDENTS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                for s in data.get("students", []):
                    reg = s.get("rollNumber") or s.get("id")
                    if reg:
                        students_map[reg] = {
                            "rollNumber": reg,
                            "name": s.get("name", f"Student {reg}"),
                            "username": s.get("leetcodeUsername", "")
                        }
        except Exception as e:
            print(f"Warning: Failed to load student metadata ({e}).")
    return students_map

def run_analysis():
    start_time = datetime.now(IST)
    problem_cache = load_problem_cache()
    student_meta = load_student_metadata()

    sub_files = glob.glob(os.path.join(SUBMISSIONS_DIR, "*.json"))
    if not sub_files:
        print("Error: No submission JSON files found in data/submissions/")
        return

    # Deduplicate submission events by (student_reg, submission_id)
    student_submission_events = defaultdict(dict)
    total_raw_events = 0

    for sfile in sorted(sub_files):
        try:
            with open(sfile, "r", encoding="utf-8") as f:
                data = json.load(f)
                students = data.get("students", {})
                for reg, sdata in students.items():
                    if reg not in student_meta:
                        student_meta[reg] = {
                            "rollNumber": reg,
                            "name": sdata.get("name", f"Student {reg}"),
                            "username": sdata.get("username", "")
                        }
                    subs = sdata.get("recentAcceptedSubmissions", [])
                    for sub in subs:
                        total_raw_events += 1
                        sub_id = str(sub.get("id", ""))
                        if sub_id and sub_id not in student_submission_events[reg]:
                            student_submission_events[reg][sub_id] = sub
        except Exception as e:
            print(f"Warning: Error reading submission file {sfile}: {e}")

    analyzed_students = {}

    total_submissions_analyzed = 0
    students_with_flags_cnt = 0
    normal_students_cnt = 0

    indicator_counts = {
        "Sudden Activity Burst": 0,
        "Repeated Same-Time Pattern": 0,
        "Large Gap Followed by Burst": 0,
        "Very High Daily Activity": 0,
        "Unusual Difficulty Jump": 0
    }

    for reg, s_info in sorted(student_meta.items(), key=lambda x: x[0]):
        events = list(student_submission_events.get(reg, {}).values())
        total_submissions_analyzed += len(events)

        daily_counts = defaultdict(int)
        hourly_counts = defaultdict(int)          # (d_str, hour_int) -> count
        overall_hourly_counts = defaultdict(int)  # hour_slot ("14:00-14:59") -> count
        daily_hard_counts = defaultdict(int)

        for ev in events:
            ts = int(ev.get("timestamp", 0))
            if ts <= 0:
                continue
            dt = datetime.fromtimestamp(ts, tz=IST)
            d_str = dt.strftime("%Y-%m-%d")
            h_int = dt.hour
            slot_name = f"{h_int:02d}:00–{h_int:02d}:59"

            daily_counts[d_str] += 1
            hourly_counts[(d_str, h_int)] += 1
            overall_hourly_counts[slot_name] += 1

            tslug = ev.get("titleSlug", "")
            q_info = problem_cache.get(tslug, {})
            if q_info.get("difficulty") == "Hard":
                daily_hard_counts[d_str] += 1

        flags = []

        # Indicator 5 & 2: Daily Activity Bursts
        for d_str, cnt in sorted(daily_counts.items()):
            if cnt >= 30:
                flags.append({
                    "indicator": "Very High Daily Activity",
                    "level": "orange",
                    "description": f"{cnt} accepted problems recorded within one calendar day ({d_str}).",
                    "requiresReview": True
                })
                indicator_counts["Very High Daily Activity"] += 1
            elif cnt >= 15:
                flags.append({
                    "indicator": "Sudden Activity Burst",
                    "level": "yellow",
                    "description": f"{cnt} accepted problems recorded within one calendar day ({d_str}).",
                    "requiresReview": True
                })
                indicator_counts["Sudden Activity Burst"] += 1

        # Indicator 3: Repeated Same-Time Pattern (5+ accepted problems in same clock hour)
        for (d_str, h_int), cnt in sorted(hourly_counts.items()):
            if cnt >= 5:
                h_slot = f"{h_int:02d}:00–{h_int:02d}:59"
                flags.append({
                    "indicator": "Repeated Same-Time Pattern",
                    "level": "yellow",
                    "description": f"{cnt} accepted problems recorded between {h_slot} IST on {d_str}.",
                    "requiresReview": True
                })
                indicator_counts["Repeated Same-Time Pattern"] += 1

        # Indicator 4: Large Gap Followed by Burst (14+ gap days, then 10+ solved in a day)
        sorted_active_dates = sorted([datetime.strptime(d, "%Y-%m-%d").date() for d in daily_counts.keys()])
        for i in range(1, len(sorted_active_dates)):
            prev_d = sorted_active_dates[i - 1]
            curr_d = sorted_active_dates[i]
            gap_days = (curr_d - prev_d).days - 1
            curr_d_str = curr_d.strftime("%Y-%m-%d")
            curr_cnt = daily_counts[curr_d_str]
            if gap_days >= 14 and curr_cnt >= 10:
                flags.append({
                    "indicator": "Large Gap Followed by Burst",
                    "level": "orange",
                    "description": f"{gap_days} consecutive inactive days followed by {curr_cnt} accepted problems on {curr_d_str}.",
                    "requiresReview": True
                })
                indicator_counts["Large Gap Followed by Burst"] += 1

        # Indicator 6: Unusual Difficulty Jump (10+ Hard problems in one calendar day)
        for d_str, hard_cnt in sorted(daily_hard_counts.items()):
            if hard_cnt >= 10:
                flags.append({
                    "indicator": "Unusual Difficulty Jump",
                    "level": "yellow",
                    "description": f"{hard_cnt} Hard problems accepted within one calendar day ({d_str}).",
                    "requiresReview": True
                })
                indicator_counts["Unusual Difficulty Jump"] += 1

        if flags:
            summary_label = "Review Indicators Present"
            students_with_flags_cnt += 1
        else:
            summary_label = "Normal Activity"
            normal_students_cnt += 1

        # Format hourly activity slot counts sorted by hour
        formatted_hourly = {k: v for k, v in sorted(overall_hourly_counts.items(), key=lambda x: x[0])}

        analyzed_students[reg] = {
            "rollNumber": reg,
            "name": s_info["name"],
            "username": s_info["username"],
            "activitySummary": summary_label,
            "activityFlags": flags,
            "dailyActivity": dict(sorted(daily_counts.items())),
            "hourlyActivity": formatted_hourly
        }

    analysis_payload = {
        "generatedAt": datetime.now(IST).isoformat(),
        "analysisVersion": "1.0",
        "disclaimer": DISCLAIMER,
        "summary": {
            "totalStudentsAnalyzed": len(analyzed_students),
            "totalSubmissionEventsAnalyzed": total_submissions_analyzed,
            "normalActivityStudents": normal_students_cnt,
            "studentsWithReviewFlags": students_with_flags_cnt,
            "indicatorBreakdown": indicator_counts
        },
        "students": analyzed_students
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_ANALYSIS_FILE, "w", encoding="utf-8") as f:
        json.dump(analysis_payload, f, indent=2, ensure_ascii=False)

    print("Activity pattern analysis completed successfully.")
    print("--------------------------------------------------")
    print(f"Students analyzed             : {len(analyzed_students)}")
    print(f"Submission events analyzed    : {total_submissions_analyzed}")
    print(f"Normal Activity students      : {normal_students_cnt}")
    print(f"Students with review flags    : {students_with_flags_cnt}")
    print("Indicator breakdown:")
    for ind_name, cnt in indicator_counts.items():
        print(f"  - {ind_name}: {cnt}")
    print(f"Output saved to               : {OUTPUT_ANALYSIS_FILE}")

if __name__ == "__main__":
    run_analysis()
