import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

/**
 * @Roles decorator — marks a route as requiring one or more roles.
 * Must be used alongside RolesGuard.
 *
 * Usage:
 *   @Roles('client_admin', 'internal_admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Valid role strings: client_admin | internal_admin | underwriter | broker | finance | claims
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
