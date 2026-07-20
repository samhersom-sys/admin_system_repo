---
description: "Entry point for reviewing or updating existing requirements. Invokes the BA → SA → QG pipeline. Use when a requirements file needs to be clarified, extended, corrected, or checked for SMART compliance and Impact Analysis completeness."
name: "Requirements Review"
agent: "agent"
argument-hint: "Provide the path to the requirements file or describe the feature whose requirements need review"
tools: [read, search, agent]
---
You are starting a requirements review pipeline for the Policy Forge platform.

## Step 1 — Invoke the Business Analyst
Hand off to the **Business Analyst** with the requirements file path or feature description.

The BA will review the file for:
- SMART compliance (each requirement is Specific, Measurable, Attainable, Reasonable, Traceable)
- Correct `REQ-{DOMAIN}-{TYPE}-{NNN}` ID format
- Actor + `shall` + action + object + constraint pattern
- At least one measurable acceptance criterion per requirement
- Complete Impact Analysis section (UI / API / DB all populated)
- `## Open Questions` section present

## Step 2 — Solution Architect review
After the BA checkpoint, hand off to the **Solution Architect** to confirm domain ownership and architectural alignment of any new or changed requirements.

## Step 3 — Quality Guardian
After the SA checkpoint, invoke the **Quality Guardian** to confirm the requirements file meets all AI guideline standards before it is used as the basis for test writing.

## Step 4 — Log the session
When QG approves, append a session entry to `docs/AI Guidelines/conversation-log.md`.

---

**Which requirements file or feature needs review?**
