import { Injectable, ForbiddenException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'

/**
 * JwtStrategy — Passport strategy that validates Bearer tokens.
 *
 * Token payload shape: { id, username, email, orgCode, role, tokenVersion }
 * Validated payload is attached to request.user by Passport.
 *
 * Token versioning: each payload carries tokenVersion. The strategy compares
 * it against users.token_version in the DB. A mismatch (e.g. after logout or
 * a new login) causes a 403 ForbiddenException in JwtAuthGuard.handleRequest.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    })
  }

  async validate(payload: {
    id: number
    username: string
    email: string
    orgCode: string
    role: string
    tokenVersion?: number
  }) {
    if (!payload?.id) {
      throw new ForbiddenException({ error: 'Invalid token payload' })
    }

    // Token versioning: reject tokens issued before the latest login/logout
    if (payload.tokenVersion !== undefined) {
      const user = await this.userRepo.findOne({
        where: { id: payload.id },
        select: { id: true, tokenVersion: true },
      })
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new ForbiddenException({ error: 'Token has been invalidated' })
      }
    }

    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      orgCode: payload.orgCode,
      role: payload.role,
    }
  }
}
