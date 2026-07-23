import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  HttpException,
} from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as bcryptjs from 'bcryptjs'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { User } from '../entities/user.entity'
import { Organisation } from '../entities/organisation.entity'
import { logError } from '../shared/log-error'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  async login(email: string, password: string) {
    if (!email || !password) {
      await logError(this.dataSource, null, email ?? null, 'POST /api/auth/login', 'ERR_AUTH_LOGIN_MISSING_FIELDS', 'Email and password are required', { emailProvided: Boolean(email), passwordProvided: Boolean(password) })
      throw new BadRequestException({ error: 'Email and password are required' })
    }

    const user = await this.userRepo.findOne({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        fullName: true,
        orgCode: true,
        role: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        tokenVersion: true,
      },
    })

    if (!user) {
      await logError(this.dataSource, null, email, 'POST /api/auth/login', 'ERR_AUTH_INVALID_CREDENTIALS', 'Invalid email or password', { email })
      throw new UnauthorizedException({ error: 'Invalid email or password' })
    }

    // Account locked?
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
      await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/login', 'ERR_AUTH_ACCOUNT_LOCKED', 'Account is locked', { userId: user.id, minutesLeft })
      throw new HttpException(
        { error: `Account is locked. Try again in ${minutesLeft} minute(s).` },
        423,
      )
    }

    // Account deactivated?
    if (!user.isActive) {
      await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/login', 'ERR_AUTH_ACCOUNT_DEACTIVATED', 'Account is deactivated', { userId: user.id })
      throw new ForbiddenException({ error: 'Account is deactivated' })
    }

    const isValidPassword = await bcryptjs.compare(password, user.passwordHash)

    if (!isValidPassword) {
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
        user.failedLoginAttempts = newAttempts
        user.lockedUntil = lockUntil
        await this.userRepo.save(user)
        await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/login', 'ERR_AUTH_TOO_MANY_ATTEMPTS', 'Account locked due to failed login attempts', { userId: user.id, failedAttempts: newAttempts })
        throw new HttpException(
          {
            error: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_LOGIN_ATTEMPTS} failed attempts.`,
          },
          423,
        )
      }

      user.failedLoginAttempts = newAttempts
      await this.userRepo.save(user)
      await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/login', 'ERR_AUTH_INVALID_CREDENTIALS', 'Invalid email or password', { userId: user.id, failedAttempts: newAttempts })
      throw new UnauthorizedException({
        error: 'Invalid email or password',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttempts,
      })
    }

    // Success â€” reset counters, record last_login, increment token_version
    const newVersion = (user.tokenVersion ?? 1) + 1
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLogin = new Date()
    user.tokenVersion = newVersion
    await this.userRepo.save(user)

    // REQ-AUTH-F-033, REQ-AUTH-F-034 — resolve orgType from organisations table
    const org = user.orgCode
      ? await this.orgRepo.findOne({ where: { orgCode: user.orgCode }, select: { orgType: true } })
      : null
    const orgType = org?.orgType ?? 'insurer'

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        orgCode: user.orgCode,
        orgType,
        role: user.role,
        tokenVersion: newVersion,
      },
      JWT_SECRET,
      { expiresIn: '30m' },
    )

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        orgCode: user.orgCode,
        orgType,
        role: user.role,
      },
    }
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, username: true, email: true, fullName: true, orgCode: true, role: true, masterHomepageTemplateId: true },
    })
    if (!user) {
      await logError(this.dataSource, null, String(userId), 'GET /api/auth/me', 'ERR_AUTH_USER_NOT_FOUND', 'User not found', { userId })
      throw new NotFoundException({ error: 'User not found' })
    }
    return user
  }

  async logout(userId: number) {
    // Invalidate all existing tokens by incrementing token_version
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (user) {
      user.tokenVersion = (user.tokenVersion ?? 1) + 1
      await this.userRepo.save(user)
    }
    return { message: 'Logged out successfully' }
  }

  async refresh(user: { id: number; username: string; email: string; orgCode: string; orgType?: string; role: string }) {
    const dbUser = await this.userRepo.findOne({
      where: { id: user.id },
      select: { id: true, isActive: true },
    })
    if (!dbUser) {
      await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/refresh', 'ERR_AUTH_USER_NOT_FOUND', 'User not found', { userId: user.id })
      throw new ForbiddenException({ error: 'User not found' })
    }
    if (!dbUser.isActive) {
      await logError(this.dataSource, user.orgCode ?? null, user.username ?? user.email ?? null, 'POST /api/auth/refresh', 'ERR_AUTH_ACCOUNT_DEACTIVATED', 'Account is deactivated', { userId: user.id })
      throw new ForbiddenException({ error: 'Account is deactivated' })
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        orgCode: user.orgCode,
        ...(user.orgType !== undefined ? { orgType: user.orgType } : {}),
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '30m' },
    )

    return { token }
  }

  async generateResetToken(adminUserId: number, targetUserId: number) {
    if (!targetUserId) {
      await logError(this.dataSource, null, String(adminUserId), 'POST /api/auth/generate-reset-token', 'ERR_AUTH_RESET_USERID_REQUIRED', 'userId is required', { adminUserId })
      throw new BadRequestException({ error: 'userId is required' })
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      select: { id: true },
    })
    if (!targetUser) {
      await logError(this.dataSource, null, String(adminUserId), 'POST /api/auth/generate-reset-token', 'ERR_AUTH_TARGET_USER_NOT_FOUND', 'User not found', { adminUserId, targetUserId })
      throw new NotFoundException({ error: 'User not found' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    // password_reset_tokens has no entity â€” use raw SQL per Â§15.20.3
    await this.dataSource.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [targetUserId, token, expiresAt, adminUserId],
    )

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return { resetUrl: `${baseUrl}/reset-password?token=${token}` }
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      await logError(this.dataSource, null, null, 'POST /api/auth/reset-password', 'ERR_AUTH_RESET_TOKEN_REQUIRED', 'token is required', {})
      throw new BadRequestException({ error: 'token is required' })
    }
    if (!newPassword) {
      await logError(this.dataSource, null, null, 'POST /api/auth/reset-password', 'ERR_AUTH_RESET_PASSWORD_REQUIRED', 'newPassword is required', {})
      throw new BadRequestException({ error: 'newPassword is required' })
    }

    // password_reset_tokens has no entity â€” use raw SQL per Â§15.20.3
    const tokenRows = await this.dataSource.query<any[]>(
      `SELECT id, user_id, used, expires_at, created_by_user_id
       FROM password_reset_tokens
       WHERE token = $1`,
      [token],
    )

    if (!tokenRows.length) {
      await logError(this.dataSource, null, null, 'POST /api/auth/reset-password', 'ERR_AUTH_RESET_INVALID_TOKEN', 'Invalid or expired token', {})
      throw new BadRequestException({ error: 'Invalid or expired token' })
    }

    const tokenRow = tokenRows[0]

    if (tokenRow.used) {
      await logError(this.dataSource, null, null, 'POST /api/auth/reset-password', 'ERR_AUTH_RESET_TOKEN_USED', 'Token has already been used', { tokenId: tokenRow.id })
      throw new BadRequestException({ error: 'Token has already been used' })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      await logError(this.dataSource, null, null, 'POST /api/auth/reset-password', 'ERR_AUTH_RESET_TOKEN_EXPIRED', 'Token has expired', { tokenId: tokenRow.id })
      throw new BadRequestException({ error: 'Token has expired' })
    }

    const hash = await bcryptjs.hash(newPassword, 10)

    const user = await this.userRepo.findOne({ where: { id: tokenRow.user_id } })
    if (user) {
      user.passwordHash = hash
      await this.userRepo.save(user)
    }

    await this.dataSource.query(
      `UPDATE password_reset_tokens SET used = true WHERE id = $1`,
      [tokenRow.id],
    )
    // password_audit_log has no entity â€” use raw SQL per Â§15.20.3
    await this.dataSource.query(
      `INSERT INTO password_audit_log (user_id, method, changed_by_user_id)
       VALUES ($1, $2, $3)`,
      [tokenRow.user_id, 'admin_reset', tokenRow.created_by_user_id],
    )

    return { message: 'Password reset successfully' }
  }

  async updateProfile(userId: number, name: string) {
    if (!name || !name.trim()) {
      await logError(this.dataSource, null, String(userId), 'PUT /api/auth/profile', 'ERR_AUTH_PROFILE_NAME_REQUIRED', 'Name is required', { userId })
      throw new BadRequestException({ error: 'Name is required' })
    }
    if (name.trim().length > 100) {
      await logError(this.dataSource, null, String(userId), 'PUT /api/auth/profile', 'ERR_AUTH_PROFILE_NAME_TOO_LONG', 'Name must be 100 characters or fewer', { userId, length: name.trim().length })
      throw new BadRequestException({ error: 'Name must be 100 characters or fewer' })
    }

    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      await logError(this.dataSource, null, String(userId), 'PUT /api/auth/profile', 'ERR_AUTH_USER_NOT_FOUND', 'User not found', { userId })
      throw new NotFoundException({ error: 'User not found' })
    }

    user.fullName = name.trim()
    await this.userRepo.save(user)

    return { data: { id: user.id, name: user.fullName, email: user.email, role: user.role } }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      await logError(this.dataSource, null, String(userId), 'POST /api/auth/change-password', 'ERR_AUTH_PASSWORD_FIELDS_REQUIRED', 'currentPassword and newPassword are required', { userId })
      throw new BadRequestException({ error: 'currentPassword and newPassword are required' })
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    })
    if (!user) {
      await logError(this.dataSource, null, String(userId), 'POST /api/auth/change-password', 'ERR_AUTH_USER_NOT_FOUND', 'User not found', { userId })
      throw new NotFoundException({ error: 'User not found' })
    }

    const isMatch = await bcryptjs.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      await logError(this.dataSource, null, String(userId), 'POST /api/auth/change-password', 'ERR_AUTH_CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect', { userId })
      throw new UnauthorizedException({ error: 'Current password is incorrect' })
    }

    user.passwordHash = await bcryptjs.hash(newPassword, 10)
    await this.userRepo.save(user)

    return { message: 'Password changed successfully' }
  }
}
