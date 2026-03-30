# db/ — Database Layer

This folder owns everything related to the PostgreSQL schema.  
It is independent of the application code in `backend/` and `app/`.

---

## Structure

```
db/
  migrations/   ← numbered schema migration scripts (run in order)
  seeds/        ← reference/test data scripts (run after migrations)
  README.md     ← this file
```

---

## Running migrations

From the project root:

```bash
npm run db:migrate
```

Or run individual files:

```bash
node db/migrations/001-create-users-table.js
node db/migrations/002-create-parties-table.js
node db/migrations/003-create-submission-table.js
```

Migrations are idempotent — safe to re-run (`CREATE TABLE IF NOT EXISTS`).

---

## Adding a new migration

1. Create a new numbered file: `db/migrations/00N-describe-the-change.js`
2. Follow the pattern of existing files (dotenv load, Pool, idempotent SQL, log output)
3. Add it to the `db:migrate` script in `package.json`
4. Document the schema change in `Technical Documentation/`

---

## Owner

The `db/` folder is owned independently of the `backend/` API layer.  
Schema changes must not be bundled into backend feature branches.  
One migration = one schema concern = one PR.
