/**
 * Permissions — action-level authorisation check.
 *
 * isActionEnabled() is the single gate used to show/hide/disable UI
 * elements based on the current user's roles.
 *
 * The action registry lives here so all checks are in one place.
 * Add new action keys to the ActionKey union type as features expand.
 */

import type { SessionUser } from '@/shared/lib/auth-session/auth-session'

// ---------------------------------------------------------------------------
// Action registry
// ---------------------------------------------------------------------------

export type ActionKey =
  | 'submission.create'
  | 'submission.edit'
  | 'submission.delete'
  | 'quote.create'
  | 'quote.bind'
  | 'policy.endorse'
  | 'policy.cancel'
  | 'invoice.create'
  | 'claim.create'
  | 'claim.edit'
  | 'admin.manageUsers'
  | 'admin.manageOrg'

// Map each action to the roles that are permitted.
// An empty array means everyone is permitted.
// Roles mirror the `role` column in the users table:
//   client_admin    — tenant organisation admin
//   internal_admin  — PolicyForge platform admin (all access)
//   underwriter     — insurance underwriter
//   broker          — placing broker
//   finance         — finance/accounts user
//   claims          — claims handler
const ACTION_ROLE_MAP: Record<ActionKey, string[]> = {
  'submission.create': [],
  'submission.edit': [],
  'submission.delete': ['client_admin', 'internal_admin', 'underwriter'],
  'quote.create': ['client_admin', 'internal_admin', 'underwriter', 'broker'],
  'quote.bind': ['client_admin', 'internal_admin', 'underwriter'],
  'policy.endorse': ['client_admin', 'internal_admin', 'underwriter'],
  'policy.cancel': ['client_admin', 'internal_admin', 'underwriter'],
  'invoice.create': ['client_admin', 'internal_admin', 'finance'],
  'claim.create': [],
  'claim.edit': ['client_admin', 'internal_admin', 'underwriter', 'claims'],
  'admin.manageUsers': ['client_admin', 'internal_admin'],
  'admin.manageOrg': ['client_admin', 'internal_admin'],
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the given user is allowed to perform the named action.
 *
 * @param actionKey  - One of the registered ActionKey values.
 * @param user       - The current SessionUser (from auth-session.getSession()).
 * @returns          - true when permitted, false when not.
 */
export function isActionEnabled(
  actionKey: ActionKey,
  user: SessionUser | null | undefined
): boolean {
  if (!user) return false

  const allowedRoles = ACTION_ROLE_MAP[actionKey]
  if (!allowedRoles) return false          // unknown action → deny
  if (allowedRoles.length === 0) return true  // open to all

  // Support both single role string (current backend — user.role) and
  // legacy roles array (user.roles — kept until all consumers migrated).
  const userRoles: string[] = user.roles ?? (user.role ? [user.role] : [])
  return allowedRoles.some((r) => userRoles.includes(r))
}
