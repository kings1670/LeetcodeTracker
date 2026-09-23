# CSD LeetCode Performance Tracker

Automated daily tracking system and web dashboard for monitoring CSD department student performance on LeetCode.

---

## STUDENT BATCH TRACKING

Support for student batch/group tracking is provided using a dedicated Excel file: `input/student_batches.xlsx`.

### Key Features
- **Authoritative Data Preservation**: `input/students.xlsx` remains the sole authoritative source for student records, names, and LeetCode details.
- **Additive & Non-Destructive**: If `input/student_batches.xlsx` is missing or empty, the entire tracker continues operating normally without interruption.
- **Multiple Batch Membership**: A student can belong to multiple batches/groups simultaneously. Their performance contributes independently to each batch dashboard view, while remaining single-counted in overall department totals.
- **Authoritative Key**: Register Number is used as the primary matching key. Student names are automatically matched and verified against `input/students.xlsx`.

### Setup & Usage Instructions

1. Open `input/student_batches.xlsx`.
2. Go to the **`Batch Details`** sheet.
3. Fill in student membership:
   - **Register Number**: Authoritative student registration number (must exist in `input/students.xlsx`).
   - **Student Name**: Reference name for faculty guidance (optional / verified against authoritative name).
   - **Batch**: Target batch or group name (e.g., `Batch 1`, `Placement Batch`, `Hackathon Team`).

#### Example Assignment:
| Register Number | Student Name | Batch |
| :--- | :--- | :--- |
| `310624150015` | Gautham B | Batch 1 |
| `310624150015` | Gautham B | Placement Batch |
| `310624150028` | Neraimathi K | Batch 1 |
| `310624150038` | V M Sanjeev | Batch 2 |

4. Save and commit `input/student_batches.xlsx`.
5. The daily automated tracker run (or `python export_json.py`) automatically merges batch memberships into the JSON data payload.
6. The web dashboard will automatically display the global **`Batch`** dropdown filter on the main dashboard and student roster pages.

---

## Technical Pipeline
- `main.py`: Primary data collection from LeetCode GraphQL API.
- `create_batch_template.py`: Generates and refreshes `input/student_batches.xlsx` template and reference sheet.
- `export_json.py`: Merges student progress, activity metrics, and batch memberships into `output/leetcode-data.json`.
- `leetcode-dashboard/`: React web app hosted on GitHub Pages.
