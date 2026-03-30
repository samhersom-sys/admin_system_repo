import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * Policy entity — maps to the `policies` table.
 * Schema source:
 *   db/migrations/009-create-policies-table.js      (base table)
 *   db/migrations/075-alter-policies-add-deleted-at.js (deleted_at)
 */
@Entity('policies')
@Index('idx_policies_quote_id', ['quoteId'])
@Index('idx_policies_submission_id', ['submissionId'])
@Index('idx_policies_status', ['status'])
export class Policy {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ name: 'quote_id', type: 'int', nullable: true })
  quoteId: number | null

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null

  @Column({ type: 'text', nullable: true })
  insured: string | null

  @Column({ name: 'insured_id', type: 'text', nullable: true })
  insuredId: string | null

  @Column({ name: 'party_id_insured', type: 'int', nullable: true })
  partyIdInsured: number | null

  @Column({ name: 'party_id_placing_broker', type: 'int', nullable: true })
  partyIdPlacingBroker: number | null

  @Column({ name: 'placing_broker', type: 'text', nullable: true })
  placingBroker: string | null

  @Column({ name: 'inception_date', type: 'text', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiry_date', type: 'text', nullable: true })
  expiryDate: string | null

  @Column({ name: 'inception_time', type: 'time', precision: 3, nullable: true })
  inceptionTime: string | null

  @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true })
  expiryTime: string | null

  @Column({ name: 'renewal_date', type: 'text', nullable: true })
  renewalDate: string | null

  @Column({ name: 'renewal_time', type: 'time', precision: 3, nullable: true })
  renewalTime: string | null

  @Column({ name: 'gross_written_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossWrittenPremium: string | null

  @Column({ type: 'text', nullable: true })
  status: string | null

  @Column({ name: 'status_id', type: 'int', nullable: true })
  statusId: number | null

  @Column({ name: 'business_type', type: 'text', nullable: true })
  businessType: string | null

  @Column({ name: 'contract_type', type: 'text', nullable: true })
  contractType: string | null

  @CreateDateColumn({ name: 'created_date', type: 'timestamptz' })
  createdDate: Date

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null

  @Column({ name: 'created_by_org_code', type: 'text', nullable: true })
  createdByOrgCode: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  // Added in migration 075
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
