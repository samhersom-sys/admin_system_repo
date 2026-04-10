# REQUIREMENTS — Reporting Domain (Backend)

**Domain Code:** `RPT-BE`  
**Location:** `backend/nest/src/reporting/`  
**Status:** Reporting backend requirements updated through dashboard widget live-data contract  
**Primary tests:** `backend/nest/src/reporting/reporting.spec.ts`, `backend/__tests__/api-smoke.test.js`, `backend/__tests__/schema-validation.test.js`

---

## 1. Impact Analysis

### UI / Front-End Impact
- Dashboard configure and dashboard view pages depend on a live widget-data endpoint instead of static preview tiles.
- Dashboard filters in the frontend require a stable request/response contract for rerunning widget queries.

### API Impact
- Existing routes remain unchanged:
  - `GET /api/report-templates`
  - `GET /api/report-templates/:id`
  - `POST /api/report-templates`
  - `PUT /api/report-templates/:id`
  - `DELETE /api/report-templates/:id`
  - `POST /api/report-templates/:id/run`
  - `GET /api/report-templates/:id/history`
  - `GET /api/report-field-mappings/:domain`
  - `GET /api/date-basis`
- New route:
  - `POST /api/dashboards/widgets/data`

### Database Impact
- No new tables are required for the first live-widget pass.
- The widget-data query layer reads from existing reporting tables only.
- Schema validation must be updated for any new table or column referenced by the widget-data SQL allow-list.

---

## 2. Scope

**In scope:** Execute one dashboard widget against live data for metric, chart, and table widgets using a safe allow-listed query builder; apply dashboard filter state to widget queries; return loading-compatible empty success shapes instead of fabricated preview data.

**Out of scope:** Persisted dashboard widget rows in a separate table, saved widget-specific filter presets, and cross-source joins inside a single widget query.

---

## 3. API Contract

### POST `/api/dashboards/widgets/data`

Auth required: Yes  
Tenant-scoped: Yes  

Request body:

| Field | Required | Type | Description |
|---|---|---|---|
| `widget` | Yes | object | The saved dashboard widget config |
| `filters` | No | object | Dashboard-level active filter state |

`widget` fields used by the backend:

| Field | Required | Type | Description |
|---|---|---|---|
| `type` | Yes | `'metric' \| 'chart' \| 'table' \| 'text'` | Widget type |
| `metric` | Metric only | string | Composite field key `source::field` |
| `attribute` | Chart only | string | Composite field key used for grouping/category |
| `yAxisAttribute` | Chart optional | string | Composite field key for alternate y-axis field |
| `legendAttribute` | Chart optional | string | Composite field key for series split |
| `measures` | Chart optional | string[] | Composite field keys for numeric aggregations |
| `attributes` | Table only | string[] | Composite field keys for table columns |
| `aggregation` | Metric/chart optional | `'count' \| 'sum' \| 'avg' \| 'min' \| 'max'` | Aggregate function |

`filters` shape:

| Field | Required | Type | Description |
|---|---|---|---|
| `analysisBasis` | No | string | `cumulative`, `ytd`, `qtd`, `mtd`, `month`, `week`, or `day` |
| `dateBasis` | No | string | Composite field key `source::field` for the date filter basis |
| `reportingDate` | No | string | ISO date used to derive the analysis window |
| `customAttributes` | No | array | `[{ field, operator, value }]` against composite field keys |

Success responses:

| Widget type | Status | Response shape |
|---|---|---|
| `text` | `200` | `{ type: 'text' }` |
| `metric` | `200` | `{ type: 'metric', value: number, label: string }` |
| `chart` | `200` | `{ type: 'chart', rows: Array<{ label: string, series?: string, values: Record<string, number> }> }` |
| `table` | `200` | `{ type: 'table', rows: Array<Record<string, unknown>> }` |

Error responses:

| Status | Case | Response |
|---|---|---|
| `400` | Unsupported widget type, missing required fields, mixed-source widget query, or unsupported filter field | `{ error: string }` |
| `404` | Referenced report/dashboard data source does not exist | `{ error: string }` |
| `500` | Unexpected query/runtime failure | `{ error: 'Dashboard widget execution failed' }` |

---

## 4. Requirements

### R01 — Existing Report Template CRUD
The existing report template CRUD and report execution routes shall keep their current behaviour.

### R02 — Widget Data Route
`POST /api/dashboards/widgets/data` shall accept a saved widget config and optional dashboard filter state, derive one or more allowed data sources from the composite field keys used by that widget, and return a live-data payload for that widget type.

Acceptance criteria:
- Queries use only allow-listed tables and columns from the reporting semantic layer.
- The tenant/org filter is always enforced from the authenticated JWT context, never from the request body.
- The endpoint returns HTTP `200` with an empty success shape when the query is valid but no rows match.

### R03 — Mixed-Source Widgets
If one widget request references fields from more than one distinct data source, the endpoint shall execute each participating source through the allow-listed semantic layer and combine the results using a widget-type-specific merge strategy instead of rejecting the request.

Acceptance criteria:
- A metric widget with `metric: 'policies::grossWrittenPremium'` is valid.
- A chart widget mixing `submissions::status` and `policies::grossWrittenPremium` returns a combined chart response by reusing the shared logical field key where available.
- A table widget mixing `submissions::reference` and `parties::name` returns rows from both sources with an explicit `source` column rather than a fake joined record.

### R04 — Dashboard Filters
The widget-data endpoint shall apply dashboard-level filter state to each participating source query when the filter field belongs to that source or can be matched by logical field key on that source.

Acceptance criteria:
- `dateBasis + reportingDate + analysisBasis` narrow the query window before aggregation.
- `customAttributes` apply allow-listed operators only.
- Filters that do not map onto a given source are skipped for that source without breaking the rest of the widget query.

### R05 — Response Shapes
The endpoint shall return stable type-specific JSON shapes so the frontend can distinguish metric, chart, table, and text widgets without parsing ad hoc structures.

Acceptance criteria:
- Metric responses contain exactly one computed numeric value.
- Chart responses return grouped rows with labels and numeric values by measure.
- Table responses return raw row objects keyed by the selected table column aliases.

## 5. Open Questions

- Cross-source widget joins are intentionally out of scope for this pass. If they are required later, a separate join-contract requirement must be written first.