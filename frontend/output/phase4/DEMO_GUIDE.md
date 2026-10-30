# TrustCarbon Phase IV demo — 7 minutes

## Before the guide arrives
- Open the browser slides (PRESENTATION.html) and the running project in separate tabs.
- Apply the activity-delete migration if it has not been applied. Check the two earlier migrations as well.
- Sign in with an existing user, then open /data/system. Save the check results.
- Keep an existing admin account and a second normal account ready in separate browser profiles. Complete TESTING.md.
- Keep public/data/phase4-valid.csv, phase4-invalid.csv and a permitted BRSR PDF ready.
- Run npm run verify:phase4. Keep evidence/verification.json visible.
- Use the synthetic fixtures only to demonstrate validation and workflow. Their values are not factual emissions estimates.

## Presentation sequence
| Time | Action | Explanation and rubric evidence |
| --- | --- | --- |
| 0:00–0:40 | Slides 1–2 | Explain the problem and the users. |
| 0:40–1:20 | Slides 3–4 | Explain React, service layer, Supabase Auth, PostgreSQL, Storage and ownership policies. |
| 1:20–2:10 | Global Explorer and Time Machine | Select India/year; show units, historical provenance, playback and one comparison. |
| 2:10–3:30 | Personal dashboard | Add the disposable commute record, reload, edit to 3 kg, reload. Delete the disposable record and reload. This proves database persistence and CRUD. |
| 3:30–4:30 | Dataset submission/admin | Reject invalid CSV locally; submit valid fixture; show admin review and persisted status. |
| 4:30–5:10 | Corporate workflow | Show one confirmed disclosure, page evidence and a matching-unit threshold. |
| 5:10–6:10 | Testing slides and evidence | Show actual passing tests, a large-input result, connection JSON and isolation evidence. State which checks used mocks. |
| 6:10–7:00 | Report and final slide | Show architecture/testing sections, state current limitations and conclude with the demonstrated outcomes. |

## Likely viva questions
**Where is the backend?** Supabase provides managed authentication, database APIs and private Storage. PostgreSQL enforces row-level access policies.

**How do you prove the database is connected?** Save a record, reload, edit, reload, delete the disposable record and reload. A green configuration label alone does not prove persistence.

**Can another user read my data?** Ownership policies restrict private rows and storage folders. Demonstrate this with two actual accounts and a direct API attempt, not only hidden buttons.

**Is this AI or machine learning?** The core analysis uses descriptive statistics and transparent rules. PDF extraction provides candidates for human review. Do not claim a trained predictive model.

**What happens when a source fails?** Requests have bounded waits, the historical dataset has a labelled bundled fallback, and the UI shows failures.

**Are trust scores official ratings?** They are the project's stated weighted rubric. They do not certify compliance or prove fraud.

**Does the corporate PDF persist?** PDF extraction and confirmed corporate metrics are held in browser-session state. Signed-in alert rules and events use Supabase.

**What does the performance test prove?** It verifies one local CSV workload of 150,000 rows. It does not establish concurrent-user capacity.
