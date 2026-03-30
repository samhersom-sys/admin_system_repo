import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * JwtAuthGuard — protects routes by verifying the Bearer JWT.
 *
 * Replaces the Express authenticateToken middleware.
 * On success: sets request.user = decoded JWT payload
 *   { id, username, email, orgCode, role }
 *
 * Returns 401 (with { error } body) if no Authorization header is present.
 * Returns 403 (with { error } body) if a Bearer token is present but
 *   invalid/expired, or if the token version no longer matches the DB
 *   (i.e. the user has logged out or logged in again since this token was issued).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (user) return user

    // Re-throw ForbiddenException from JwtStrategy (token versioning mismatch)
    if (err instanceof ForbiddenException) throw err

    // If an error was thrown by the JWT library, a token was present but invalid
    if (err) throw new ForbiddenException({ error: 'Invalid or expired token' })

    // Check whether an Authorization header was actually sent
    const req = context?.switchToHttp().getRequest<any>()
    const hasBearer = req?.headers?.authorization?.startsWith('Bearer ')

    if (hasBearer) {
      // Token was sent but failed validation
      throw new ForbiddenException({ error: 'Invalid or expired token' })
    }

    // No Authorization header at all
    throw new UnauthorizedException({ error: 'No authorization token provided' })
  }
}
