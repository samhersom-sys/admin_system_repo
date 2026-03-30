/**
 * Module Catalogue — shared constants for the PolicyForge module licensing system.
 *
 * This is the single source of truth for module keys, labels, descriptions,
 * and dependency rules for all settings components.
 *
 * IMPORTANT: The REQUIRES map is a UX convenience only.  The same rules MUST
 * also be enforced server-side in PUT /api/admin/orgs/:orgCode/modules
 * (§4.9 — Backend-First Business Logic).  OQ-044 tracks the DB migration.
 *
 * To add a new module: add the key here ONLY.  All components derive from this.
 */

export const MODULE_KEYS = [
  'module:submission-workflow',
  'module:binding-authorities',
  'module:bordereau-import',
  'module:claims',
  'module:finance',
  'module:reporting',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

export const MODULE_LABELS: Record<ModuleKey, string> = {
  'module:submission-workflow': 'Submission Workflow',
  'module:binding-authorities': 'Binding Authorities',
  'module:bordereau-import': 'Bordereau Import',
  'module:claims': 'Claims',
  'module:finance': 'Finance',
  'module:reporting': 'Reporting',
}

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  'module:submission-workflow': 'End-to-end submission creation, triage and workflow management.',
  'module:binding-authorities': 'Binding authority contract management and capacity tracking.',
  'module:bordereau-import': 'Bulk bordereau import processing. Requires Binding Authorities.',
  'module:claims': 'Claims registration, management and payment tracking.',
  'module:finance': 'Premium accounting, cash allocation and financial reporting.',
  'module:reporting': 'Management information, dashboards and regulatory reports.',
}

/** To enable the key module, the mapped value must already be enabled. */
export const MODULE_REQUIRES: Partial<Record<ModuleKey, ModuleKey>> = {
  'module:bordereau-import': 'module:binding-authorities',
}
