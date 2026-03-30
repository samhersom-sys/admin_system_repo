import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * User entity — maps to the `users` table.
 * Schema source: db/migrations/001-create-users-table.js
 */
@Entity('users')
@Index('users_email_index', ['email'])
@Index('users_username_index', ['username'])
@Index('users_org_code_index', ['orgCode'])
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName: string | null

  @Column({ name: 'org_code', type: 'varchar', length: 50, nullable: true })
  orgCode: string | null

  @Column({ type: 'varchar', length: 50, default: 'user' })
  role: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date | null

  @Column({ name: 'token_version', type: 'int', default: 1, nullable: true })
  tokenVersion: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
