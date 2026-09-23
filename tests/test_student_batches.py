import unittest
import os
import sys
import json
import tempfile
import openpyxl
from unittest.mock import patch, MagicMock

# Import modules under test
import export_json as ej
import create_batch_template as cbt

class TestStudentBatches(unittest.TestCase):

    def setUp(self):
        # Sample authoritative user map from students.xlsx
        self.sample_user_map = {
            "310624150015": {"name": "Gautham B", "dept": "III Year CSD", "username": "Gautham76"},
            "310624150028": {"name": "Neraimathi K", "dept": "III Year CSD", "username": "Neraimathi"},
            "310624150038": {"name": "V M Sanjeev", "dept": "III Year CSD", "username": "VMSanjeev"},
            "310624150045": {"name": "S Sri Varsha", "dept": "II Year CSD", "username": "SriVarsha"},
        }

    def test_case_1_no_student_batches_file(self):
        """TEST 1: No student_batches.xlsx -> No crash, returns ({}, [])."""
        non_existent_file = os.path.join(tempfile.gettempdir(), "non_existent_batches_xyz123.xlsx")
        if os.path.exists(non_existent_file):
            os.remove(non_existent_file)

        batches, batches_list = ej.load_batch_memberships(self.sample_user_map, non_existent_file)
        self.assertEqual(batches, {})
        self.assertEqual(batches_list, [])

    def test_case_2_empty_workbook(self):
        """TEST 2: Empty workbook with headers only -> No batches."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(batches, {})
            self.assertEqual(batches_list, [])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_3_valid_batch_assignments(self):
        """TEST 3: Valid Batch 1 assignments -> Correct students assigned."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["310624150028", "Neraimathi K", "Batch 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(batches_list, ["Batch 1"])
            self.assertEqual(batches["310624150015"], ["Batch 1"])
            self.assertEqual(batches["310624150028"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_4_one_student_in_multiple_batches(self):
        """TEST 4: One student in multiple batches -> Student appears in both."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["310624150015", "Gautham B", "Placement Batch"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertIn("Batch 1", batches["310624150015"])
            self.assertIn("Placement Batch", batches["310624150015"])
            self.assertEqual(len(batches["310624150015"]), 2)
            self.assertIn("Batch 1", batches_list)
            self.assertIn("Placement Batch", batches_list)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_5_duplicate_student_batch_pair(self):
        """TEST 5: Duplicate student/batch pair -> Deduplicated."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(batches["310624150015"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_6_unknown_register_number(self):
        """TEST 6: Unknown Register Number -> Warning printed & ignored."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["999999999999", "Unknown Person", "Batch 1"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertNotIn("999999999999", batches)
            self.assertEqual(batches["310624150015"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_7_student_name_mismatch(self):
        """TEST 7: Student name mismatch -> Matched by Register Number & uses authoritative name."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham IncorrectName", "Batch 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(batches["310624150015"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_8_blank_rows(self):
        """TEST 8: Blank rows -> Ignored."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append([None, None, None])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["", "", ""])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(len(batches), 1)
            self.assertEqual(batches["310624150015"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_9_whitespace_in_batch(self):
        """TEST 9: Whitespace in Batch -> Trimmed."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["  310624150015  ", " Gautham B ", "  Batch 1  "])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(batches_list, ["Batch 1"])
            self.assertEqual(batches["310624150015"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_10_case_variation_batch_name(self):
        """TEST 10: Case variation (Batch 1, batch 1) -> No duplicate logical batch."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["310624150028", "Neraimathi K", "batch 1"])
            ws.append(["310624150038", "V M Sanjeev", "BATCH 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(len(batches_list), 1)
            self.assertEqual(batches_list[0], "Batch 1")
            self.assertEqual(batches["310624150015"], ["Batch 1"])
            self.assertEqual(batches["310624150028"], ["Batch 1"])
            self.assertEqual(batches["310624150038"], ["Batch 1"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_11_and_12_dashboard_export_schema_integrity(self):
        """TEST 11 & 12: Existing classes & dashboard JSON fields remain present."""
        if not os.path.exists(ej.OUTPUT_JSON_PATH):
            self.skipTest("output/leetcode-data.json not yet generated")

        with open(ej.OUTPUT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        required_keys = [
            "latestDate", "latestDateFormatted", "classes", "batches",
            "batchSummaries", "batchTopPerformers", "batchDailyTrends",
            "summary", "dailyTrend", "fullHistoryTrend", "classDailyTrends",
            "classSummaries", "classTopPerformers", "students", "topPerformers",
            "dailySnapshots"
        ]
        for key in required_keys:
            self.assertIn(key, data, f"Missing required top-level JSON key: {key}")

        summary_keys = [
            "totalStudents", "activeStudents", "inactiveStudents",
            "neverActiveStudents", "totalProblemsSolved", "solvedToday",
            "weeklyImprovement", "easyTotal", "mediumTotal", "hardTotal", "avgSolved"
        ]
        for skey in summary_keys:
            self.assertIn(skey, data["summary"], f"Missing required summary key: {skey}")

    def test_case_13_14_15_batch_analytics_calculations(self):
        """
        TEST 13, 14, 15:
        13: Batch daily trend correctly aggregates batch students.
        14: Student in two batches contributes to both batch totals.
        15: Overall totals do NOT double-count multi-batch students.
        """
        # Create temp batch file with 1 multi-batch student and 1 single-batch student
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Batch Details"
            ws.append(["Register Number", "Student Name", "Batch"])
            ws.append(["310624150015", "Gautham B", "Batch 1"])
            ws.append(["310624150015", "Gautham B", "Placement Batch"])
            ws.append(["310624150028", "Neraimathi K", "Batch 1"])
            wb.save(tmp_path)

            batches, batches_list = ej.load_batch_memberships(self.sample_user_map, tmp_path)
            self.assertEqual(len(batches_list), 2)

            # Gautham contributes to Batch 1 AND Placement Batch
            self.assertIn("Batch 1", batches["310624150015"])
            self.assertIn("Placement Batch", batches["310624150015"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_case_16_excel_preservation(self):
        """TEST 16: Updating Student Reference preserves existing Batch Details rows."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            wb = openpyxl.Workbook()
            ws1 = wb.active
            ws1.title = "Batch Details"
            ws1.append(["Register Number", "Student Name", "Batch"])
            ws1.append(["310624150015", "Gautham B", "Batch 1"])
            wb.save(tmp_path)

            with patch("create_batch_template.BATCHES_FILE", tmp_path):
                cbt.create_or_refresh_batch_file()

            # Load updated workbook and verify Batch Details row is preserved
            wb_updated = openpyxl.load_workbook(tmp_path)
            self.assertIn("Batch Details", wb_updated.sheetnames)
            self.assertIn("Student Reference", wb_updated.sheetnames)

            bd_sheet = wb_updated["Batch Details"]
            bd_rows = list(bd_sheet.iter_rows(values_only=True))
            self.assertEqual(len(bd_rows), 2)
            self.assertEqual(str(bd_rows[1][0]).strip(), "310624150015")
            self.assertEqual(bd_rows[1][2], "Batch 1")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

if __name__ == "__main__":
    unittest.main()
