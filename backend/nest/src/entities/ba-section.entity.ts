import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * BASection entity — maps to `binding_authority_sections` table.
 * Schema source: db/migrations/016-create-binding-authority-sections-table.js
 *
 * Frontend field mapping:
 *   written_premium_limit → limit_amount column
 *   currency              → limit_currency column
 *   line_size             → payload.line_size
 */
@Entity('binding_authority_sections')
@Index('idx_ba_sections_ba_id', ['bindingAuthorityId'])
export class BASection {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'binding_authority_id', type: 'int' })
  bindingAuthorityId: number

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ name: 'class_of_business', type: 'varchar', length: 200, nullable: true })
  classOfBusiness: string | null

  @Column({ name: 'class_of_business_code', type: 'varchar', length: 50, nullable: true })
  classOfBusinessCode: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'days_on_cover', type: 'int', nullable: true })
  daysOnCover: number | null

  @Column({ name: 'limit_currency', type: 'varchar', length: 10, nullable: true })
  limitCurrency: string | null

  @Column({ name: 'limit_amount', type: 'numeric', precision: 15, scale: 2, nullable: true })
  limitAmount: number | null

  @Column({ name: 'time_basis', type: 'varchar', length: 100, nullable: true })
  timeBasis: string | null

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  payload: Record<string, unknown> | null

  // Financial view columns (from schema 29 / migration 123)
  @Column({ name: 'annual_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualGrossPremium: string | null

  @Column({ name: 'annual_net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualNetPremium: string | null

  @Column({ name: 'gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossPremium: string | null

  @Column({ name: 'net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  netPremium: string | null

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

  @Column({ name: 'limit_amount_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmountWhole: string | null

  @Column({ name: 'limit_amount_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmountMarket: string | null

  @Column({ name: 'limit_amount_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  limitAmountLine: string | null

  @Column({ name: 'sum_insured_whole', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsuredWhole: string | null

  @Column({ name: 'sum_insured_market', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsuredMarket: string | null

  @Column({ name: 'sum_insured_line', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsuredLine: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
