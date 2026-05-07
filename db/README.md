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
node db/schema/01-core-users.js
node db/schema/02-core-parties.js
node db/schema/03-core-submissions.js
```

Schema scripts are idempotent — safe to re-run (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

---

## Updating schema

1. Update the relevant `db/schema/*.js` file
2. Follow the pattern of existing files (dotenv load, Pool, idempotent SQL, log output)
3. Keep `db:migrate` in `package.json` aligned with `db/schema` ordering
4. Document the schema change in `Technical Documentation/`

---

## Owner

The `db/` folder is owned independently of the `backend/` API layer.  
Schema changes must not be bundled into backend feature branches.  
One schema concern = one PR.
