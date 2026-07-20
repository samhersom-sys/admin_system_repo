---
description: "Entry point for a database-only change — adding a table, modifying an existing entity, updating seed data — where there is no UI change. Invokes the DBA → Dev → QG pipeline."
name: "DB Change"
agent: "agent"
argument-hint: "Describe the database change needed (table name, columns, reason)"
tools: [read, search, agent]
---
You are starting a database change pipeline for the Policy Forge platform.

## Step 1 — Confirm SA approval
A database change still requires Solution Architect sign-off on domain ownership and multi-tenant compliance, even if there is no UI change.

If no SA review has been completed for this change, invoke the **Solution Architect** first and wait for their GO decision on the DB layer before continuing.

## Step 2 — Invoke the Database Architect
Hand off to the **Database Architect** with the change description.

The DBA will:
1. Design or update the TypeORM entity file(s) in `backend/nest/src/entities/`
2. Update or create seed data in `db/seeds/` if reference data changed
3. Confirm `tenant_id` is present on any new tenant-scoped entity
4. Issue the instruction to run `npm run db:sync`

## Step 3 — Invoke the Developer
Once DBA confirms entities are complete and `db:sync` has been run, hand off to the **Developer** to implement any service, controller, or query changes needed to support the new schema.

## Step 4 — Quality Guardian review
When the Developer confirms `npm run test:all` is green, invoke the **Quality Guardian** to confirm multi-tenant compliance and test coverage.

## Step 5 — Log the session
When QG approves, append a session entry to `docs/AI Guidelines/conversation-log.md`.

---

**Describe the database change (table, columns, and reason):**
