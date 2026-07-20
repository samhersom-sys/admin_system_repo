---
description: "Entry point for reviewing and baselining existing implementation that was built without the agent pipeline. Scans what is currently built, documents it as requirements, checks architectural compliance, and presents to the Project Sponsor for approval before adding to the Approved Baseline Register."
name: "Discovery"
agent: "agent"
argument-hint: "Name the feature, page, or area of the application to review"
tools: [read, search, agent]
---
You are running a Discovery review for the Policy Forge platform.

Discovery is used when code already exists but was built without going through the standard delivery pipeline.  The goal is to document what is actually there, check it meets project standards, and get Project Sponsor approval to add it to the Approved Baseline Register.

---

## Step 1 — Codebase Scan
Invoke the **Explore** subagent to read the existing implementation thoroughly.

The Explore scan must identify:
- All files involved (frontend components, backend service/controller/entity, tests if any)
- What the feature actually does — user-visible behaviour, API endpoints, DB tables used
- What role(s) can access it and under what conditions
- Any obvious gaps: missing tests, missing requirements file, missing error handling, hardcoded values, cross-domain imports

Report the findings in plain English before proceeding.

---

## Step 2 — Requirements Documentation (Business Analyst)
Invoke the **Business Analyst** to write a `.requirements.md` file from the discovered implementation.

The BA must write requirements that describe what the code **actually does** — not what it should ideally do.  If the implementation is incomplete or incorrect, that must be flagged as an open question, not silently documented as correct.

The BA must also:
- Write sponsor review steps in `docs/Project Documentation/09-Sponsor-Review-Checklist.md` (status: `Draft`) describing how the Project Sponsor can verify the feature in the browser
- Flag any gaps between what was built and what good practice requires

---

## Step 3 — Architectural Compliance (Solution Architect)
Invoke the **Solution Architect** to review the existing implementation against `docs/AI Guidelines/04-Architectural-Boundaries.md`.

The SA must flag:
- Any cross-domain imports present
- Any missing tenant_id filters
- Any API contracts that deviate from the standard format
- Any domain logic found in the wrong layer

**Violations found here do not block Discovery approval** — they are logged as open questions for a follow-up Bug Fix or Architecture Change delivery.  Discovery is about documenting what exists, not fixing it.

---

## Step 4 — Project Sponsor Approval Gate
Present the following to the Project Sponsor and wait for explicit approval:

```
DISCOVERY REVIEW — [Feature Name]

What was found (plain English):
  [2–4 sentence summary of what the feature does]

Requirements documented:
  [path to .requirements.md]
  REQ IDs written: [list]

Sponsor review steps written:
  [checklist entry ID — how to verify this in the browser]

Architectural issues found (to be fixed in a follow-up delivery):
  [list, or: none]

Test coverage:
  [existing tests found: yes/no — gaps noted: list or none]

---
Do you approve this implementation for the baseline?
Reply 'approved' to add to the Approved Baseline Register, or describe any concerns.
```

---

## Step 5 — Add to Approved Baseline Register
On Project Sponsor approval, add a new **BL-[NNN]** entry to `docs/Project Documentation/10-Approved-Baseline-Register.md` using the simplified index format defined in that file.

Set the sponsor review checklist entry status to `Confirmed` if the steps were verified during this session, or leave as `Draft` if the sponsor has not yet walked through them in the browser.

---

## Step 6 — Log the Session
Append a session entry to `docs/AI Guidelines/conversation-log.md` using the multi-agent format from `docs/AI Guidelines/17-Agent-Collaboration-Standards.md §17.9`.

---

**Which feature, page, or area of the application do you want to review and baseline?**
