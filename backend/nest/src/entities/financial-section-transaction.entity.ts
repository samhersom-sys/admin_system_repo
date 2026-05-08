import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PolicySectionTransaction entity — maps to `policy_section_transactions`.
 * Schema source: db/schema/28-financial-transactions.js
 */
@Entity('policy_section_transactions')
@Index('idx_policy_section_transactions_transaction', ['policyTransactionId'])
@Index('idx_policy_section_transactions_section', ['sectionId'])
export class PolicySectionTransaction {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_transaction_id', type: 'int' })
  policyTransactionId: number

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number

  @Column({ name: 'transaction_type', type: 'varchar', length: 50, nullable: true })
  transactionType: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'limit_amount_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountCurrent: string
  @Column({ name: 'limit_amount_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountPrev: string
  @Column({ name: 'limit_amount_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountMvmt: string

  @Column({ name: 'excess_amount_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountCurrent: string
  @Column({ name: 'excess_amount_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountPrev: string
  @Column({ name: 'excess_amount_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountMvmt: string

  @Column({ name: 'sum_insured_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredCurrent: string
  @Column({ name: 'sum_insured_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredPrev: string
  @Column({ name: 'sum_insured_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredMvmt: string

  @Column({ name: 'gross_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumCurrent: string
  @Column({ name: 'gross_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumPrev: string
  @Column({ name: 'gross_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumMvmt: string

  @Column({ name: 'net_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumCurrent: string
  @Column({ name: 'net_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumPrev: string
  @Column({ name: 'net_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumMvmt: string

  @Column({ name: 'tax_receivable_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivableCurrent: string
  @Column({ name: 'tax_receivable_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivablePrev: string
  @Column({ name: 'tax_receivable_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivableMvmt: string

  @Column({ name: 'deductions_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsCurrent: string
  @Column({ name: 'deductions_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsPrev: string
  @Column({ name: 'deductions_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsMvmt: string

  @Column({ name: 'annual_gross_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumCurrent: string
  @Column({ name: 'annual_gross_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumPrev: string
  @Column({ name: 'annual_gross_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumMvmt: string

  @Column({ name: 'annual_net_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumCurrent: string
  @Column({ name: 'annual_net_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumPrev: string
  @Column({ name: 'annual_net_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumMvmt: string

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

/**
 * BASection transaction entity — maps to `binding_authority_section_transactions`.
 * Schema source: db/schema/28-financial-transactions.js
 */
@Entity('binding_authority_section_transactions')
@Index('idx_ba_section_transactions_ba_transaction', ['baTransactionId'])
@Index('idx_ba_section_transactions_section', ['sectionId'])
export class BASectionTransaction {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'ba_transaction_id', type: 'int' })
  baTransactionId: number

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number

  @Column({ name: 'transaction_type', type: 'varchar', length: 50, nullable: true })
  transactionType: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'limit_amount_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountCurrent: string
  @Column({ name: 'limit_amount_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountPrev: string
  @Column({ name: 'limit_amount_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) limitAmountMvmt: string

  @Column({ name: 'excess_amount_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountCurrent: string
  @Column({ name: 'excess_amount_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountPrev: string
  @Column({ name: 'excess_amount_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) excessAmountMvmt: string

  @Column({ name: 'sum_insured_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredCurrent: string
  @Column({ name: 'sum_insured_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredPrev: string
  @Column({ name: 'sum_insured_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) sumInsuredMvmt: string

  @Column({ name: 'gross_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumCurrent: string
  @Column({ name: 'gross_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumPrev: string
  @Column({ name: 'gross_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) grossPremiumMvmt: string

  @Column({ name: 'net_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumCurrent: string
  @Column({ name: 'net_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumPrev: string
  @Column({ name: 'net_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) netPremiumMvmt: string

  @Column({ name: 'tax_receivable_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivableCurrent: string
  @Column({ name: 'tax_receivable_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivablePrev: string
  @Column({ name: 'tax_receivable_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) taxReceivableMvmt: string

  @Column({ name: 'deductions_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsCurrent: string
  @Column({ name: 'deductions_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsPrev: string
  @Column({ name: 'deductions_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) deductionsMvmt: string

  @Column({ name: 'annual_gross_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumCurrent: string
  @Column({ name: 'annual_gross_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumPrev: string
  @Column({ name: 'annual_gross_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualGrossPremiumMvmt: string

  @Column({ name: 'annual_net_premium_current', type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumCurrent: string
  @Column({ name: 'annual_net_premium_prev',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumPrev: string
  @Column({ name: 'annual_net_premium_mvmt',    type: 'numeric', precision: 18, scale: 2, default: 0 }) annualNetPremiumMvmt: string

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
