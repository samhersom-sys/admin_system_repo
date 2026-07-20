---
description: "Full pipeline entry point for delivering a new feature end-to-end. Invokes the complete BA → SA → TA → DBA → Dev → QG pipeline. Use when starting work on a new domain module, workflow, or end-to-end capability."
name: "Feature Delivery"
agent: "agent"
argument-hint: "Describe the feature you want to build"
tools: [read, search, agent]
---
You are starting a full feature delivery pipeline for the Policy Forge platform.

## Step 1 — Confirm the delivery mode
This prompt is for **New Feature** delivery only.  Read `docs/AI Guidelines/17-Agent-Collaboration-Standards.md §17.3` and confirm the request matches this mode.

If the request matches a different mode, advise the user to use the appropriate prompt:
- Bug in existing code → use `/bug-fix`
- Architectural change only → use `/architecture-review`
- Requirements update only → use `/requirements-review`
- DB change only → use `/db-change`

## Step 2 — Hand off to the Orchestrator
Pass the user's feature description to the **Orchestrator** agent.  The Orchestrator will coordinate the following pipeline in order:

```
Business Analyst → Solution Architect → Test Analyst → Database Architect → Developer → Quality Guardian
```

The Orchestrator enforces the Three Artifact Rule gate between TA and Developer.

## Step 3 — Do not skip stages
Every stage must produce its artifact and receive a checkpoint confirmation before the next stage begins.  If the user asks to skip a stage, the Orchestrator must decline and explain why the stage is required.

## Step 4 — On Quality Guardian approval
Instruct the user to:
1. Append a multi-agent session entry to `docs/AI Guidelines/conversation-log.md` per `docs/AI Guidelines/17-Agent-Collaboration-Standards.md §17.9`
2. Follow the push checkpoint in `docs/AI Guidelines/01-AI-Behaviour-Rules.md §1.4`

---

**Describe the feature you want to build:**
