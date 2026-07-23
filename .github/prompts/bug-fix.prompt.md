---
description: "Entry point for fixing a bug in existing code. Invokes the Dev → TA → QG pipeline. Use when a specific incorrect behaviour has been identified and requirements for the affected feature already exist."
name: "Bug Fix"
agent: "agent"
argument-hint: "Describe the bug: what happens vs. what should happen, and where"
tools: [read, search, agent]
---
You are starting a bug fix pipeline for the Policy Forge platform.

## Step 1 — Confirm requirements exist
Before any code is changed, confirm a `.requirements.md` file covers the affected feature.

If no requirements file exists for the affected area, **stop**.  A missing requirements file means the correct behaviour is undocumented.  Invoke the `/feature-delivery` prompt instead to establish requirements first.

## Step 2 — Invoke the Developer
Hand off to the **Developer** agent with the full bug description: what happens, what should happen, and the file(s) involved.

The Developer will:
1. Diagnose the root cause
2. Implement the fix
3. Confirm all existing tests still pass
4. Add a regression test if no existing test covers this scenario (hand off to the Test Analyst if a new test spec is needed)

## Step 3 — Quality Guardian review
When the Developer confirms `npm run test:all` is green, invoke the **Quality Guardian** for an exit check.

## Step 4 — Log the session
When QG approves, append a session entry to `docs/AI Guidelines/conversation-log.md`.

---

**Describe the bug (what happens vs. what should happen, and where):**
