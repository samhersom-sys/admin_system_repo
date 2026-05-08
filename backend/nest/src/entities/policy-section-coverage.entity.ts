import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PolicySectionCoverage entity — maps to the `policy_section_coverages` table.
 * Schema source: db/schema/11-policy-section-coverages.js
 */
@Entity('policy_section_coverages')
@Index('idx_policy_section_coverages_section_id', ['sectionId'])
@Index('idx_policy_section_coverages_policy_id', ['policyId'])
export class PolicySectionCoverage {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_id', type: 'int', nullable: true })
  policyId: number | null

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  coverage: string | null

  @Column({ name: 'class_of_business', type: 'text', nullable: true })
  classOfBusiness: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'limit_currency', type: 'text', nullable: true })
  limitCurrency: string | null

  @Column({ name: 'limit_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmount: string | null

  @Column({ name: 'excess_currency', type: 'text', nullable: true })
  excessCurrency: string | null

  @Column({ name: 'excess_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  excessAmount: string | null

  @Column({ name: 'sum_insured_currency', type: 'text', nullable: true })
  sumInsuredCurrency: string | null

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured: string | null

  @Column({ name: 'premium_currency', type: 'text', nullable: true })
  premiumCurrency: string | null

  @Column({ name: 'gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremium: string | null

  @Column({ name: 'net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremium: string | null

  @Column({ name: 'tax_receivable', type: 'numeric', precision: 18, scale: 2, nullable: true })
  taxReceivable: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  @Column({ name: 'days_on_cover', type: 'int', nullable: true })
  daysOnCover: number | null
}

/**
 * QuoteSectionCoverage entity — maps to the `quote_section_coverages` table.
 * Schema source: db/schema/11-policy-section-coverages.js (migration 100 section)
 */
@Entity('quote_section_coverages')
@Index('idx_quote_section_coverages_section_id', ['sectionId'])
@Index('idx_quote_section_coverages_quote_id', ['quoteId'])
export class QuoteSectionCoverage {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'quote_id', type: 'int' })
  quoteId: number

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  coverage: string | null

  @Column({ name: 'class_of_business', type: 'text', nullable: true })
  classOfBusiness: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'limit_currency', type: 'text', nullable: true })
  limitCurrency: string | null

  @Column({ name: 'limit_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmount: string | null

  @Column({ name: 'excess_currency', type: 'text', nullable: true })
  excessCurrency: string | null

  @Column({ name: 'excess_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  excessAmount: string | null

  @Column({ name: 'sum_insured_currency', type: 'text', nullable: true })
  sumInsuredCurrency: string | null

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured: string | null

  @Column({ name: 'premium_currency', type: 'text', nullable: true })
  premiumCurrency: string | null

  @Column({ name: 'gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremium: string | null

  @Column({ name: 'net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremium: string | null

  @Column({ name: 'tax_receivable', type: 'numeric', precision: 18, scale: 2, nullable: true })
  taxReceivable: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  @Column({ name: 'days_on_cover', type: 'int', nullable: true })
  daysOnCover: number | null
}
