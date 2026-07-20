import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PolicySection entity — maps to the `policy_sections` table.
 * Schema source: db/schema/10-policy-sections.js (base columns)
 *               db/schema/29-financial-view-columns.js (financial view columns)
 */
@Entity('policy_sections')
@Index('idx_policy_sections_policy_id', ['policyId'])
export class PolicySection {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_id', type: 'int' })
  policyId: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ name: 'class_of_business', type: 'text', nullable: true })
  classOfBusiness: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'inception_time', type: 'time', precision: 3, nullable: true, default: '00:00:00.000' })
  inceptionTime: string | null

  @Column({ name: 'effective_time', type: 'time', precision: 3, nullable: true, default: '00:00:00.000' })
  effectiveTime: string | null

  @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true, default: '23:59:59.000' })
  expiryTime: string | null

  @Column({ name: 'days_on_cover', type: 'int', nullable: true })
  daysOnCover: number | null

  @Column({ name: 'limit_currency', type: 'varchar', length: 8, nullable: true })
  limitCurrency: string | null

  @Column({ name: 'limit_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmount: string | null

  @Column({ name: 'limit_loss_qualifier', type: 'text', nullable: true })
  limitLossQualifier: string | null

  @Column({ name: 'excess_currency', type: 'varchar', length: 8, nullable: true })
  excessCurrency: string | null

  @Column({ name: 'excess_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  excessAmount: string | null

  @Column({ name: 'excess_loss_qualifier', type: 'text', nullable: true })
  excessLossQualifier: string | null

  @Column({ name: 'sum_insured_currency', type: 'varchar', length: 8, nullable: true })
  sumInsuredCurrency: string | null

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured: string | null

  @Column({ name: 'premium_currency', type: 'varchar', length: 8, nullable: true })
  premiumCurrency: string | null

  @Column({ name: 'gross_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossGrossPremium: string | null

  @Column({ name: 'gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremium: string | null

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  deductions: string | null

  @Column({ name: 'net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremium: string | null

  @Column({ name: 'tax_receivable', type: 'numeric', precision: 18, scale: 2, nullable: true })
  taxReceivable: string | null

  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  // Financial view columns (schema 29 / migration 123)
  @Column({ name: 'annual_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualGrossPremium: string | null

  @Column({ name: 'annual_net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualNetPremium: string | null

  @Column({ name: 'written_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  writtenPremium: string | null

  @Column({ name: 'signed_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  signedPremium: string | null

  @Column({ name: 'gross_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremiumWhole: string | null

  @Column({ name: 'gross_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremiumMarket: string | null

  @Column({ name: 'gross_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremiumLine: string | null

  @Column({ name: 'net_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremiumWhole: string | null

  @Column({ name: 'net_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremiumMarket: string | null

  @Column({ name: 'net_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremiumLine: string | null

  @Column({ name: 'annual_gross_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualGrossPremiumWhole: string | null

  @Column({ name: 'annual_gross_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualGrossPremiumMarket: string | null

  @Column({ name: 'annual_gross_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualGrossPremiumLine: string | null

  @Column({ name: 'annual_net_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualNetPremiumWhole: string | null

  @Column({ name: 'annual_net_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualNetPremiumMarket: string | null

  @Column({ name: 'annual_net_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualNetPremiumLine: string | null

  @Column({ name: 'written_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  writtenPremiumWhole: string | null

  @Column({ name: 'written_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  writtenPremiumMarket: string | null

  @Column({ name: 'written_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  writtenPremiumLine: string | null

  @Column({ name: 'signed_premium_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  signedPremiumWhole: string | null

  @Column({ name: 'signed_premium_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  signedPremiumMarket: string | null

  @Column({ name: 'signed_premium_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  signedPremiumLine: string | null

  // Earning engine (Phase 2) — REQ-EARN-S-002
  @Column({ name: 'resolved_earning_pattern_id', type: 'int', nullable: true })
  resolvedEarningPatternId: number | null
}
