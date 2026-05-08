import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * SubmissionRelated entity — maps to `submission_related`.
 * Schema source: db/schema/24-submission-extras.js
 *
 * Links two submissions as related (bidirectional — (A,B) == (B,A)).
 */
@Entity('submission_related')
@Index('idx_submission_related_submission_id', ['submissionId'])
@Index('idx_submission_related_related_submission_id', ['relatedSubmissionId'])
export class SubmissionRelated {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'submission_id', type: 'int' })
  submissionId: number

  @Column({ name: 'related_submission_id', type: 'int' })
  relatedSubmissionId: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null
}

/**
 * SubmissionEditLock entity — maps to `submission_edit_lock`.
 * Schema source: db/schema/24-submission-extras.js
 *
 * One row per locked submission (PK = submission_id). Expires at `expires_at`.
 */
@Entity('submission_edit_lock')
@Index('idx_submission_edit_lock_expires_at', ['expiresAt'])
@Index('idx_submission_edit_lock_user_id', ['lockedByUserId'])
export class SubmissionEditLock {
  @PrimaryColumn({ name: 'submission_id', type: 'int' })
  submissionId: number

  @Column({ name: 'org_code', type: 'text' })
  orgCode: string

  @Column({ name: 'locked_by_user_id', type: 'int' })
  lockedByUserId: number

  @Column({ name: 'locked_by_user_name', type: 'text' })
  lockedByUserName: string

  @Column({ name: 'locked_by_user_email', type: 'text', nullable: true })
  lockedByUserEmail: string | null

  @CreateDateColumn({ name: 'acquired_at', type: 'timestamptz' })
  acquiredAt: Date

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
