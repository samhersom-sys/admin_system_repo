---
description: "Post-delivery retrospective. Run after Gate 4 is approved to review session efficiency, verify all documentation is complete and accurate, check code organisation against standards, and flag loose ends before the branch is pushed. Invokes Quality Guardian."
name: "Post-Delivery Retrospective"
agent: "agent"
argument-hint: "Provide the feature name, or leave blank to use the most recent session log entry"
tools: [read, search, agent]
---
Invoke the **Quality Guardian** to run a retrospective on the completed delivery. Runs after Gate 4 is approved, before `git push`.

**Section 1 - Efficiency:** Was the pipeline proportionate? Were any agents or gates unnecessary? Verdict: Efficient or Over-engineered with one sentence.

**Section 2 - Documentation Health:** Verify:
- `.requirements.md` reflects what was built; Impact Analysis still accurate
- `09-Sponsor-Review-Checklist.md` entry exists, status `Confirmed`, steps match the live implementation
- `10-Approved-Baseline-Register.md` has a BL-[NNN] entry (or updated entry with CR ref)
- `11-Gap-Analysis.md` updated for any gap this feature closes
- `08-Open-Questions.md` - no questions left in limbo

**Section 3 - Code Organisation:** Verify:
- All new files in correct locations per `12-Folder-Structure.md`; no orphaned or misnamed files
- No `console.log`, commented-out blocks, or `.skip` without an open question
- All tests have `// @req REQ-{DOMAIN}-{TYPE}-{NNN}` tags; no tags referencing removed REQ IDs

**Section 4 - Loose Ends:** Any TODOs, stub UI sections, untested edge cases, or npm script changes without workflow updates?

**Report:** Plain-English summary of issues found per section. End with: READY TO PUSH or RESOLVE BEFORE PUSHING with minimum actions required.

If ready, the user may proceed to the push checkpoint in `01-AI-Behaviour-Rules.md section 1.4`.

**Which feature should the retrospective cover?**
