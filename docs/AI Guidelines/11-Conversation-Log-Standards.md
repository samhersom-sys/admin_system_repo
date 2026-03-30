# AI GUIDELINES — SECTION 11: CONVERSATION LOG STANDARDS

This document defines how the AI assistant must record and persist a summary of every conversation session on the Policy Forge platform.

---

## 11.1  Purpose

The AI must maintain a running log of all significant interactions so that context is never lost between sessions.  
This log acts as a shared memory between the AI and the team — preventing repeated clarifications, preserving decisions, and providing an audit trail of work.

---

## 11.2  Log File Location

All conversation entries must be written to:

```
AI Guidelines/conversation-log.md
```

This file must be created if it does not exist.  
It must **never** be deleted or overwritten — only appended to.

---

## 11.3  Entry Format

Each conversation must produce **one log entry** appended at the top of the file (newest first).  
The entry must follow this exact format:

```markdown
---

### [YYYY-MM-DD] [HH:MM] — <Short Title>

**Request:**  
<One to three sentences summarising what the user asked for.>

**Outcome:**  
<One to three sentences summarising what was done, decided, or deferred.>

**Files Changed:**  
- `path/to/file.ext` — brief description of change (or "none" if no files were changed)

**Open Questions / Deferred:**  
- <Any unresolved questions raised during the session, or "none">

---
```

- Date and time must reflect when the request was made (use the current date provided in context).
- The short title must be a concise label (5–8 words) describing the session topic.
- If multiple distinct requests were made in one session, produce one entry per request.

---

## 11.4  What Must Be Logged

The AI must log every session that involves **any** of the following:

- A code change, file creation, or file deletion
- A requirements or architecture decision
- A clarification that resolved an open question
- A request that was explicitly deferred or rejected
- An update to any guideline file

Trivial exchanges (e.g. "where were we?", "show me the file") do not require a log entry unless they surface a decision.

---

## 11.5  When to Write the Log Entry

The log entry must be written **at the end of every qualifying session**, after all changes have been made and confirmed.  
It must not be written speculatively mid-session.

---

## 11.6  Example Entry

```markdown
---

### [2026-03-11] [14:32] — Add Conversation Log Guideline

**Request:**  
User asked to update the AI guidelines so that every conversation is persisted to a markdown log file, organised by date and time, with a summary of the request and outcome.

**Outcome:**  
Created `AI Guidelines/11-Conversation-Log-Standards.md` defining the log format, location, and rules for when entries must be written.

**Files Changed:**  
- `AI Guidelines/11-Conversation-Log-Standards.md` — created new guideline file

**Open Questions / Deferred:**  
- none

---
```

---

## 11.7  Enforcement

- The AI must not close a qualifying session without appending a log entry.
- If the AI is interrupted before writing the log, it must write the entry at the start of the next session as a retrospective entry, marked `[RETROSPECTIVE]` in the title.
- The log file must not be reformatted, sorted, or summarised — only appended to.

---

## 11.8  Handoff Precision In Multi-Root Workspaces

When a session summary, retrospective entry, or handoff is written in a workspace that contains multiple repos, legacy folders, or reference copies, the summary must identify the active implementation location precisely.

Required rules:

- Use the exact workspace-relative file path for every file that was changed.
- If a similarly named legacy or backup repo was inspected but not modified, state that explicitly.
- If tests or servers point at a different workspace folder than the one being edited, record that mismatch in the handoff.
- Do not collapse distinct roots into a generic label such as "the repo" when that would hide where the actual changes live.

This rule exists to prevent resumptions from patching the wrong tree after compaction, rate limits, or interrupted sessions.
