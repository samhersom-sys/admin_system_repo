---
description: "Entry point for resuming an interrupted or in-progress delivery. Use when implementation is already partially complete, a previous session was interrupted, or you know which Project Sponsor Gate was last approved and want to continue from that point without restarting from BA."
name: "Resume Delivery"
agent: "agent"
argument-hint: "Describe the feature and the last gate you approved, or leave blank to read the conversation log"
tools: [read, search, agent]
---
You are resuming an interrupted delivery pipeline for the Policy Forge platform.

## Step 1 — Establish Context From the Conversation Log
Read the most recent relevant entry in `docs/AI Guidelines/conversation-log.md` for this feature.

If no log entry exists, ask the user:
1. The feature name
2. The path to the `.requirements.md` file (if it exists)
3. The last Project Sponsor Gate that was explicitly approved

Do not guess the resume point.  If the log is ambiguous, ask.

## Step 2 — Verify Existing Artifacts Are Still Valid
Before invoking any agent, check that all artifacts produced so far are still intact and consistent:

- `.requirements.md` exists and has not been changed since Gate 1 approval
- Test spec(s) exist and every REQ ID in them still matches the requirements file
- If any entity files were changed by DBA, confirm `npm run db:sync` was run

**If any artifact has changed since it was last approved**, re-present the relevant gate to the Project Sponsor before resuming.  Do not silently continue past a gate that was invalidated by a subsequent change.

## Step 3 — Determine the Resume Point
Route to the remaining pipeline based on the last approved gate:

| Last completed | Resume pipeline |
|---|---|
| Delivery Plan approved only | BA → SA → TA → DBA → Dev → QG |
| Gate 1 — Requirements approved | SA → TA → DBA → Dev → QG |
| Gate 2 — Architecture approved | TA → DBA → Dev → QG |
| Gate 3 — Test Plan approved | DBA → Dev → QG |
| Implementation started but incomplete | Dev → QG |
| Developer done, not yet reviewed | QG only |

## Step 4 — Present a Resume Plan
Before invoking any agent, show the user a brief Resume Plan:

```
RESUME PLAN — [Feature Name]

Last approved gate:    [gate number and name]
Artifacts confirmed:   [list confirmed artifacts]
Resuming from:         [agent name]
Remaining pipeline:    [ordered list]
Project Sponsor gates remaining:
  [list remaining gates]

---
Confirm to resume from [agent name], or describe any corrections.
```

Wait for explicit user approval before invoking any agent.

## Step 5 — Resume the Pipeline
Invoke the Orchestrator to coordinate from the resume point, applying all standard checkpoint and Project Sponsor Gate rules from that point forward.

---

**Which feature are you resuming, and what was the last gate approved?**
