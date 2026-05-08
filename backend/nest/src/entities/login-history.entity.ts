import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * LoginHistory entity — maps to the `login_history` table.
 *
 * One row is inserted for every successful user login.
 * This enables the User Login Activity core report to show a full historic
 * log rather than only the most-recent login from the `users` table.
 *
 * REQ-RPT-BE-R010a / REQ-RPT-BE-R010b
 */
@Entity('login_history')
@Index('idx_login_history_user_id', ['userId'])
@Index('idx_login_history_org_code', ['orgCode'])
@Index('idx_login_history_logged_in_at', ['loggedInAt'])
export class LoginHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'user_id', type: 'int' })
  userId: number

  @Column({ name: 'user_name', type: 'varchar', length: 255 })
  userName: string

  @Column({ name: 'org_code', type: 'varchar', length: 50, nullable: true })
  orgCode: string | null

  @CreateDateColumn({ name: 'logged_in_at', type: 'timestamptz' })
  loggedInAt: Date
}
