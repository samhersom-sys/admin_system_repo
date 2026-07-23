import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/**
 * BrokerSubmission entity — maps to the `broker_submissions` table.
 * Source: backend/nest/src/migrations/1747200000000-CreateBrokerSubmissionsTable.ts
 *
 * Requirements: backend/nest/src/broker-submissions/broker-submissions.requirements.md
 * Domain: PSS-BRK-BE
 */
@Entity('broker_submissions')
@Index('idx_broker_submissions_org_code', ['orgCode'])
@Index('idx_broker_submissions_source', ['source'])
@Index('idx_broker_submissions_status', ['workflowStatus'])
export class BrokerSubmission {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null

  @Column({ name: 'insured_name', type: 'varchar', length: 500 })
  insuredName: string

  @Column({ name: 'class_of_business', type: 'varchar', length: 100, nullable: true })
  classOfBusiness: string | null

  @Column({ name: 'inception_date', type: 'date' })
  inceptionDate: string

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'estimated_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  estimatedPremium: number | null

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'USD' })
  currency: string | null

  /** FK to lookup_broker_submission_sources.code — 'manual' | 'platform_shared' */
  @Column({ type: 'varchar', length: 50 })
  source: string

  @Column({ name: 'workflow_status', type: 'varchar', length: 50, default: 'Created' })
  workflowStatus: string

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
