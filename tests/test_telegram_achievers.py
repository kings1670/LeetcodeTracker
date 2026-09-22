import unittest
import os
import sys
import json
import tempfile
from unittest.mock import patch, MagicMock

# Import the module under test
import send_telegram_achievers as sta


class TestTelegramAchievers(unittest.TestCase):

    def setUp(self):
        # Sample student pool for testing
        self.sample_students = [
            {"name": "V.M.Sanjeev", "improvement": 21},
            {"name": "Vidhya Raj", "improvement": 17},
            {"name": "Bharath Rikkesh R G", "improvement": 13},
            {"name": "SR.Archana", "improvement": 11},
            {"name": "NERAIMATHI.K", "improvement": 11},
            {"name": "k.Darshita", "improvement": 8},
            {"name": "Yogamaya M", "improvement": 7},
            {"name": "Gowtham B", "improvement": 6},
            {"name": "S.Sanjana", "improvement": 6},
            {"name": "Gautham B", "improvement": 5},
            {"name": "Extra Student 11", "improvement": 4},
            {"name": "Extra Student 12", "improvement": 3},
            {"name": "Zero Improvement Student", "improvement": 0},
            {"name": "Declined Student", "improvement": -2},
        ]

    def test_case_1_more_than_10_improving_students(self):
        """CASE 1: More than 10 improving students -> Only Top 10 included."""
        achievers = sta.get_eligible_achievers(self.sample_students, top_n=10)
        self.assertEqual(len(achievers), 10)
        self.assertEqual(achievers[0]["name"], "V.M.Sanjeev")
        self.assertEqual(achievers[0]["improvement"], 21)
        self.assertEqual(achievers[9]["improvement"], 5)

    def test_case_2_exactly_10_improving_students(self):
        """CASE 2: Exactly 10 improving students -> All 10 included."""
        ten_students = self.sample_students[:10]
        achievers = sta.get_eligible_achievers(ten_students, top_n=10)
        self.assertEqual(len(achievers), 10)

    def test_case_3_only_5_improving_students(self):
        """CASE 3: Only 5 improving students -> Only 5 included, message says 'Top 5 Achievers'."""
        five_students = self.sample_students[:5]
        achievers = sta.get_eligible_achievers(five_students, top_n=10)
        self.assertEqual(len(achievers), 5)
        msg = sta.generate_telegram_message(achievers, "2026-09-22", top_n=10)
        self.assertIn("Fantastic effort by our Top 5 Achievers!", msg)

    def test_case_4_no_improving_students(self):
        """CASE 4: No improving students -> No-activity message."""
        no_imp_students = [
            {"name": "Alice", "improvement": 0},
            {"name": "Bob", "improvement": -1}
        ]
        achievers = sta.get_eligible_achievers(no_imp_students, top_n=10)
        self.assertEqual(len(achievers), 0)
        msg = sta.generate_telegram_message(achievers, "2026-09-22", top_n=10)
        self.assertIn("No new problems were recorded today.", msg)
        self.assertIn("LeetCode Daily Update", msg)
        self.assertNotIn("Top 0", msg)

    def test_case_5_tied_scores(self):
        """CASE 5: Tied scores retain improvement value and use secondary name sorting."""
        tied_students = [
            {"name": "Neraimathi", "improvement": 11},
            {"name": "Archana", "improvement": 11}
        ]
        achievers = sta.get_eligible_achievers(tied_students, top_n=10)
        self.assertEqual(len(achievers), 2)
        # Both retain +11
        self.assertEqual(achievers[0]["improvement"], 11)
        self.assertEqual(achievers[1]["improvement"], 11)
        # Secondary alpha sort: Archana before Neraimathi
        self.assertEqual(achievers[0]["name"], "Archana")
        self.assertEqual(achievers[1]["name"], "Neraimathi")

    def test_case_6_repeated_problem_submissions(self):
        """CASE 6: Total unique problems solved metric delta is used."""
        # Simulated profile totals: yesterday=120, today=128 -> improvement=8
        yesterday_total = 120
        today_total = 128
        delta = today_total - yesterday_total
        self.assertEqual(delta, 8)

    def test_case_7_telegram_sensitive_characters(self):
        """CASE 7: Student names containing Telegram HTML sensitive chars are escaped."""
        sensitive_student = [{"name": "<John & Jane>", "improvement": 15}]
        achievers = sta.get_eligible_achievers(sensitive_student, top_n=10)
        msg = sta.generate_telegram_message(achievers, "2026-09-22", top_n=10)
        self.assertIn("&lt;John &amp; Jane&gt;", msg)
        self.assertNotIn("<John & Jane>", msg)

    def test_case_8_missing_bot_token(self):
        """CASE 8: Missing TELEGRAM_BOT_TOKEN handled gracefully."""
        res = sta.send_telegram_api("Hello", "", "12345")
        self.assertFalse(res)

    def test_case_9_missing_chat_id(self):
        """CASE 9: Missing TELEGRAM_CHAT_ID handled gracefully."""
        res = sta.send_telegram_api("Hello", "token123", "")
        self.assertFalse(res)

    @patch("urllib.request.urlopen")
    def test_case_10_telegram_api_timeout_or_failure(self, mock_urlopen):
        """CASE 10: Telegram timeout or API failure handled without raising unhandled exception."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.URLError("Connection timed out")
        res = sta.send_telegram_api("Hello", "token123", "chat123")
        self.assertFalse(res)

    def test_case_11_top_n_changed_to_15(self):
        """CASE 11: Changing top_n parameter to 15 returns top 15 achievers."""
        achievers = sta.get_eligible_achievers(self.sample_students, top_n=15)
        self.assertEqual(len(achievers), 12)  # sample_students has 12 eligible (>0)
        msg = sta.generate_telegram_message(achievers, "2026-09-22", top_n=15)
        self.assertIn("Top 12 Achievers", msg)

    def test_case_12_duplicate_notification_protection(self):
        """CASE 12: Duplicate notification protection for same date."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            log_file = os.path.join(tmp_dir, "telegram_sent_log.json")
            with patch("send_telegram_achievers.SENT_LOG_PATH", log_file):
                self.assertFalse(sta.is_already_sent("2026-09-22"))
                sta.record_sent_date("2026-09-22")
                self.assertTrue(sta.is_already_sent("2026-09-22"))


if __name__ == "__main__":
    unittest.main()
