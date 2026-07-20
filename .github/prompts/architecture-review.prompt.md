---
description: "Entry point for reviewing a proposed architectural change — new domain, cross-domain event, new shared module, API contract change, or anything that touches domain boundaries. Invokes the SA → BA → DBA → Dev → QG pipeline."
name: "Architecture Review"
agent: "agent"
argument-hint: "Describe the architectural change being proposed"
tools: [read, search, agent]
---
You are starting an architecture review pipeline for the Policy Forge platform.

## Step 1 — Invoke the Solution Architect
Hand off to the **Solution Architect** with the proposed change description.  The SA will produce a structured review note with an explicit Go / No-Go per layer (UI / API / DB).

The SA must confirm:
- Domain ownership is unambiguous
- No cross-domain imports would be introduced
- Cross-domain communication uses events
- Multi-tenant compliance is addressed

## Step 2 — Route based on the SA decision

After the SA checkpoint:
- If requirements must be created or updated → invoke the **Business Analyst**
- If DB schema changes are needed → invoke the **Database Architect** (after SA gives GO on DB layer)
- If requirements and DB are settled → invoke the **Developer**

## Step 3 — Quality Guardian review
When the Developer confirms `npm run test:all` is green, invoke the **Quality Guardian**.

## Step 4 — Log the session
When QG approves, append a multi-agent session entry to `docs/AI Guidelines/conversation-log.md` per `docs/AI Guidelines/17-Agent-Collaboration-Standards.md §17.9`.

---

**Describe the architectural change being proposed:**
