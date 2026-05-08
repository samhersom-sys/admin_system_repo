import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PasswordResetToken entity — maps to `password_reset_tokens`.
 * Schema source: db/schema/23-auth.js
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id', type: 'int' })
  userId: number

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string

  @Column({ type: 'boolean', default: false })
  used: boolean

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null
}

/**
 * PasswordAuditLog entity — maps to `password_audit_log`.
 * Schema source: db/schema/23-auth.js
 */
@Entity('password_audit_log')
export class PasswordAuditLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id', type: 'int' })
  userId: number

  @Column({ type: 'varchar', length: 50 })
  method: string

  @CreateDateColumn({ name: 'changed_at', type: 'timestamp' })
  changedAt: Date

  @Column({ name: 'changed_by_user_id', type: 'int', nullable: true })
  changedByUserId: number | null
}

/**
 * ErrorLog entity — maps to `error_log`.
 * Schema source: db/schema/23-auth.js
 */
@Entity('error_log')
@Index('error_log_org_code_idx', ['orgCode'])
@Index('error_log_created_at_idx', ['createdAt'])
export class ErrorLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'text', nullable: true })
  orgCode: string | null

  @Column({ name: 'user_name', type: 'text', nullable: true })
  userName: string | null

  @Column({ type: 'text' })
  source: string

  @Column({ name: 'error_code', type: 'text' })
  errorCode: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'jsonb', default: '{}' })
  context: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
