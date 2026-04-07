/**
 * auth.spec.ts — AuthService unit tests
 * Domain: AUTH-BE-NE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   R01 — login
 *   R02 — getMe
 *   R03 — logout
 *   R04 — refresh
 *   R05 — generateResetToken
 *   R06 — resetPassword
 *   R07 — updateProfile
 *   R08 — changePassword
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { HttpException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { User } from '../entities/user.entity'
import * as bcryptjs from 'bcryptjs'

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  const u = new User()
  u.id = 1
  u.username = 'testuser'
  u.email = 'test@example.com'
  u.passwordHash = bcryptjs.hashSync('Password123!', 10)
  u.fullName = 'Test User'
  u.orgCode = 'TST'
  u.role = 'user'
  u.isActive = true
  u.failedLoginAttempts = 0
  u.lockedUntil = null
  u.lastLogin = null
  u.tokenVersion = 1
  Object.assign(u, overrides)
  return u
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService
  let mockUserRepo: Record<string, jest.Mock>
  let mockDataSource: Record<string, jest.Mock>

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    }

    mockDataSource = {
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R01 — login
  // -------------------------------------------------------------------------
  describe('login', () => {
    it('T-AUTH-BE-NE-R01a: throws BadRequestException when email or password is missing', async () => {
      await expect(service.login('', 'pass')).rejects.toThrow(BadRequestException)
      await expect(service.login('user@test.com', '')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R01b: throws UnauthorizedException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.login('unknown@test.com', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('T-AUTH-BE-NE-R01c: throws 423 HttpException when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000) // 10 min from now
      mockUserRepo.findOne.mockResolvedValue(makeUser({ lockedUntil }))
      await expect(service.login('test@example.com', 'any')).rejects.toThrow(HttpException)
    })

    it('T-AUTH-BE-NE-R01d: throws ForbiddenException when account is deactivated', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser({ isActive: false, lockedUntil: null }))
      await expect(service.login('test@example.com', 'any')).rejects.toThrow(ForbiddenException)
    })

    it('T-AUTH-BE-NE-R01e: throws UnauthorizedException when password is incorrect', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser())
      mockUserRepo.save.mockResolvedValue(makeUser({ failedLoginAttempts: 1 }))
      await expect(service.login('test@example.com', 'WrongPass!')).rejects.toThrow(UnauthorizedException)
    })

    it('T-AUTH-BE-NE-R01f: returns token and user on successful login', async () => {
      const user = makeUser()
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      const result = await service.login('test@example.com', 'Password123!')
      expect(result.token).toBeDefined()
      expect(result.user.email).toBe('test@example.com')
      expect(result.message).toBe('Login successful')
    })

    it('T-AUTH-BE-NE-R01g: resets failed attempts and updates lastLogin on success', async () => {
      const user = makeUser({ failedLoginAttempts: 2 })
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      await service.login('test@example.com', 'Password123!')
      const saved = mockUserRepo.save.mock.calls[0][0]
      expect(saved.failedLoginAttempts).toBe(0)
      expect(saved.lastLogin).toBeDefined()
    })

    it('T-AUTH-BE-NE-R01h: locks account after MAX_LOGIN_ATTEMPTS failed attempts', async () => {
      const user = makeUser({ failedLoginAttempts: 4 }) // 5th attempt will lock
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      await expect(service.login('test@example.com', 'WrongPass!')).rejects.toThrow(HttpException)
      const saved = mockUserRepo.save.mock.calls[0][0]
      expect(saved.lockedUntil).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R02 — getMe
  // -------------------------------------------------------------------------
  describe('getMe', () => {
    it('T-AUTH-BE-NE-R02a: returns user when found', async () => {
      const user = makeUser()
      mockUserRepo.findOne.mockResolvedValue(user)

      const result = await service.getMe(1)
      expect(result.email).toBe('test@example.com')
    })

    it('T-AUTH-BE-NE-R02b: throws NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.getMe(99)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R03 — logout
  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('T-AUTH-BE-NE-R03a: increments tokenVersion to invalidate existing tokens', async () => {
      const user = makeUser({ tokenVersion: 2 })
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      await service.logout(1)
      const saved = mockUserRepo.save.mock.calls[0][0]
      expect(saved.tokenVersion).toBe(3)
    })

    it('T-AUTH-BE-NE-R03b: returns success message', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser())
      mockUserRepo.save.mockResolvedValue(makeUser())

      const result = await service.logout(1)
      expect(result.message).toBe('Logged out successfully')
    })

    it('T-AUTH-BE-NE-R03c: does not throw when user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.logout(99)).resolves.toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R04 — refresh
  // -------------------------------------------------------------------------
  describe('refresh', () => {
    const userPayload = { id: 1, username: 'testuser', email: 'test@example.com', orgCode: 'TST', role: 'user' }

    it('T-AUTH-BE-NE-R04a: returns a new JWT token when user is active', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser())

      const result = await service.refresh(userPayload)
      expect(result.token).toBeDefined()
    })

    it('T-AUTH-BE-NE-R04b: throws ForbiddenException when user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.refresh(userPayload)).rejects.toThrow(ForbiddenException)
    })

    it('T-AUTH-BE-NE-R04c: throws ForbiddenException when user is deactivated', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser({ isActive: false }))
      await expect(service.refresh(userPayload)).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R05 — generateResetToken
  // -------------------------------------------------------------------------
  describe('generateResetToken', () => {
    it('T-AUTH-BE-NE-R05a: throws BadRequestException when targetUserId is missing', async () => {
      await expect(service.generateResetToken(1, 0)).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R05b: throws NotFoundException when target user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.generateResetToken(1, 99)).rejects.toThrow(NotFoundException)
    })

    it('T-AUTH-BE-NE-R05c: inserts reset token and returns resetUrl', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser())
      mockDataSource.query.mockResolvedValue([])

      const result = await service.generateResetToken(1, 1)
      expect(result.resetUrl).toContain('/reset-password?token=')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R06 — resetPassword
  // -------------------------------------------------------------------------
  describe('resetPassword', () => {
    it('T-AUTH-BE-NE-R06a: throws BadRequestException when token is missing', async () => {
      await expect(service.resetPassword('', 'NewPass123!')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R06b: throws BadRequestException when newPassword is missing', async () => {
      await expect(service.resetPassword('sometoken', '')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R06c: throws BadRequestException when token is not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]) // no token row
      await expect(service.resetPassword('badtoken', 'NewPass123!')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R06d: throws BadRequestException when token is already used', async () => {
      const tokenRow = { id: 1, user_id: 1, used: true, expires_at: new Date(Date.now() + 3600000), created_by_user_id: 1 }
      mockDataSource.query.mockResolvedValueOnce([tokenRow])
      await expect(service.resetPassword('usedtoken', 'NewPass123!')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R06e: throws BadRequestException when token is expired', async () => {
      const tokenRow = { id: 1, user_id: 1, used: false, expires_at: new Date(Date.now() - 1000), created_by_user_id: 1 }
      mockDataSource.query.mockResolvedValueOnce([tokenRow])
      await expect(service.resetPassword('expiredtoken', 'NewPass123!')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R06f: resets password and marks token as used on success', async () => {
      const tokenRow = { id: 1, user_id: 1, used: false, expires_at: new Date(Date.now() + 3600000), created_by_user_id: 1 }
      mockDataSource.query.mockResolvedValueOnce([tokenRow])     // SELECT token
      mockUserRepo.findOne.mockResolvedValue(makeUser())
      mockUserRepo.save.mockResolvedValue(makeUser())
      mockDataSource.query.mockResolvedValueOnce([])     // UPDATE token used
      mockDataSource.query.mockResolvedValueOnce([])     // INSERT audit log

      const result = await service.resetPassword('validtoken', 'NewPass123!')
      expect(result.message).toBe('Password reset successfully')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R07 — updateProfile
  // -------------------------------------------------------------------------
  describe('updateProfile', () => {
    it('T-AUTH-BE-NE-R07a: throws BadRequestException when name is blank', async () => {
      await expect(service.updateProfile(1, '   ')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R07b: throws BadRequestException when name exceeds 100 characters', async () => {
      await expect(service.updateProfile(1, 'x'.repeat(101))).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R07c: throws NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.updateProfile(99, 'New Name')).rejects.toThrow(NotFoundException)
    })

    it('T-AUTH-BE-NE-R07d: updates fullName and returns user data', async () => {
      const user = makeUser()
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue({ ...user, fullName: 'New Name' })

      const result = await service.updateProfile(1, 'New Name')
      expect(result.data.name).toBe('New Name')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-AUTH-BE-NE-R08 — changePassword
  // -------------------------------------------------------------------------
  describe('changePassword', () => {
    it('T-AUTH-BE-NE-R08a: throws BadRequestException when currentPassword or newPassword is missing', async () => {
      await expect(service.changePassword(1, '', 'NewPass!')).rejects.toThrow(BadRequestException)
      await expect(service.changePassword(1, 'OldPass!', '')).rejects.toThrow(BadRequestException)
    })

    it('T-AUTH-BE-NE-R08b: throws NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null)
      await expect(service.changePassword(99, 'old', 'new')).rejects.toThrow(NotFoundException)
    })

    it('T-AUTH-BE-NE-R08c: throws UnauthorizedException when current password is wrong', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser())
      await expect(service.changePassword(1, 'WrongPass!', 'NewPass123!')).rejects.toThrow(UnauthorizedException)
    })

    it('T-AUTH-BE-NE-R08d: updates passwordHash on success', async () => {
      const user = makeUser()
      mockUserRepo.findOne.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      const result = await service.changePassword(1, 'Password123!', 'NewPass456!')
      expect(result.message).toBe('Password changed successfully')
      expect(mockUserRepo.save).toHaveBeenCalled()
    })
  })
})
