import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * Quote entity — maps to the `quotes` table.
 * Schema source:
 *   db/migrations/008-create-quotes-table.js      (base table)
 *   db/migrations/074-alter-quotes-add-deleted-at.js (deleted_at)
 */
@Entity('quotes')
@Index('idx_quotes_submission_id', ['submissionId'])
@Index('idx_quotes_status', ['status'])
export class Quote {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null

  @Column({ type: 'text', nullable: true })
  insured: string | null

  @Column({ name: 'insured_id', type: 'text', nullable: true })
  insuredId: string | null

  @Column({ type: 'text', nullable: true })
  status: string | null

  @Column({ name: 'business_type', type: 'text', nullable: true })
  businessType: string | null

  @Column({ name: 'inception_date', type: 'text', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiry_date', type: 'text', nullable: true })
  expiryDate: string | null

  @Column({ name: 'inception_time', type: 'time', precision: 3, nullable: true })
  inceptionTime: string | null

  @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true })
  expiryTime: string | null

  @CreateDateColumn({ name: 'created_date', type: 'timestamptz' })
  createdDate: Date

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null

  @Column({ name: 'created_by_org_code', type: 'text', nullable: true })
  createdByOrgCode: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  // Added in migration 084
  @Column({ name: 'quote_currency', type: 'text', default: 'USD' })
  quoteCurrency: string

  // Added in migration 092
  @Column({ name: 'last_opened_date', type: 'timestamp', nullable: true })
  lastOpenedDate: Date | null

  // Added in migration 093 — Block 2 header fields
  @Column({ name: 'year_of_account', type: 'text', nullable: true })
  yearOfAccount: string | null

  @Column({ name: 'lta_applicable', type: 'boolean', default: false })
  ltaApplicable: boolean

  @Column({ name: 'lta_start_date', type: 'date', nullable: true })
  ltaStartDate: string | null

  @Column({ name: 'lta_start_time', type: 'time', nullable: true })
  ltaStartTime: string | null

  @Column({ name: 'lta_expiry_date', type: 'date', nullable: true })
  ltaExpiryDate: string | null

  @Column({ name: 'lta_expiry_time', type: 'time', nullable: true })
  ltaExpiryTime: string | null

  @Column({ name: 'contract_type', type: 'text', nullable: true })
  contractType: string | null

  @Column({ name: 'method_of_placement', type: 'text', nullable: true })
  methodOfPlacement: string | null

  @Column({ name: 'unique_market_reference', type: 'text', nullable: true })
  uniqueMarketReference: string | null

  @Column({ name: 'renewable_indicator', type: 'text', default: 'No' })
  renewableIndicator: string

  @Column({ name: 'renewal_date', type: 'date', nullable: true })
  renewalDate: string | null

  @Column({ name: 'renewal_status', type: 'text', nullable: true })
  renewalStatus: string | null

  // Added in migration 074
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  /** Serialize with snake_case keys so the JSON matches DB column names. */
  toJSON() {
    return {
      id: this.id,
      reference: this.reference,
      submission_id: this.submissionId,
      insured: this.insured,
      insured_id: this.insuredId,
      status: this.status,
      business_type: this.businessType,
      inception_date: this.inceptionDate,
      expiry_date: this.expiryDate,
      inception_time: this.inceptionTime,
      expiry_time: this.expiryTime,
      created_date: this.createdDate,
      created_by: this.createdBy,
      created_by_org_code: this.createdByOrgCode,
      payload: this.payload,
      quote_currency: this.quoteCurrency,
      last_opened_date: this.lastOpenedDate,
      year_of_account: this.yearOfAccount,
      lta_applicable: this.ltaApplicable,
      lta_start_date: this.ltaStartDate,
      lta_start_time: this.ltaStartTime,
      lta_expiry_date: this.ltaExpiryDate,
      lta_expiry_time: this.ltaExpiryTime,
      contract_type: this.contractType,
      method_of_placement: this.methodOfPlacement,
      unique_market_reference: this.uniqueMarketReference,
      renewable_indicator: this.renewableIndicator,
      renewal_date: this.renewalDate,
      renewal_status: this.renewalStatus,
      deleted_at: this.deletedAt,
    }
  }
}
