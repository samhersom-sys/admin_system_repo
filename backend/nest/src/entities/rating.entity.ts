import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * RatingSchedule entity — maps to `rating_schedules`.
 * Schema source: db/schema/19-rating.js
 */
@Entity('rating_schedules')
@Index('idx_rating_schedules_ba_section_id', ['bindingAuthoritySectionId'])
@Index('idx_rating_schedules_parent', ['parentScheduleId'])
export class RatingSchedule {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'binding_authority_section_id', type: 'int', nullable: true })
  bindingAuthoritySectionId: number | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null

  @Column({ name: 'placement_methods', type: 'text', array: true, default: '{}' })
  placementMethods: string[]

  @Column({ type: 'int', default: 1 })
  version: number

  @Column({ name: 'parent_schedule_id', type: 'int', nullable: true })
  parentScheduleId: number | null

  @Column({ name: 'last_modified_date', type: 'timestamptz', nullable: true })
  lastModifiedDate: Date | null

  @Column({ name: 'last_modified_by', type: 'varchar', length: 255, nullable: true })
  lastModifiedBy: string | null
}

/**
 * RatingRule entity — maps to `rating_rules`.
 * Schema source: db/schema/19-rating.js
 */
@Entity('rating_rules')
@Index('idx_rating_rules_schedule_id', ['ratingScheduleId'])
export class RatingRule {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'rating_schedule_id', type: 'int' })
  ratingScheduleId: number

  @Column({ name: 'rule_name', type: 'varchar', length: 255, nullable: true })
  ruleName: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string

  @Column({ name: 'field_source', type: 'varchar', length: 50 })
  fieldSource: string

  @Column({ type: 'varchar', length: 20 })
  operator: string

  @Column({ name: 'field_value', type: 'text', nullable: true })
  fieldValue: string | null

  @Column({ name: 'rate_percentage', type: 'numeric', precision: 10, scale: 5 })
  ratePercentage: string

  @Column({ name: 'rate_type', type: 'varchar', length: 20, default: 'PERCENTAGE' })
  rateType: string

  @Column({ name: 'coverage_type_id', type: 'int', nullable: true })
  coverageTypeId: number | null

  @Column({ name: 'coverage_sub_type_id', type: 'int', nullable: true })
  coverageSubTypeId: number | null

  @Column({ type: 'int', default: 100 })
  priority: number

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null

  @Column({ name: 'rule_group', type: 'varchar', length: 100, nullable: true })
  ruleGroup: string | null

  @Column({ name: 'group_number', type: 'int', default: 1 })
  groupNumber: number

  @Column({ name: 'logical_operator', type: 'varchar', length: 10, default: 'AND' })
  logicalOperator: string

  @Column({ name: 'sequence_in_group', type: 'int', default: 1 })
  sequenceInGroup: number
}

/**
 * LocationPremiumCalculation entity — maps to `location_premium_calculations`.
 * Schema source: db/schema/19-rating.js
 */
@Entity('location_premium_calculations')
@Index('idx_loc_prem_calc_quote_id', ['quoteId'])
@Index('idx_loc_prem_calc_rating_schedule_id', ['ratingScheduleId'])
export class LocationPremiumCalculation {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'quote_id', type: 'int', nullable: true })
  quoteId: number | null

  @Column({ name: 'section_id', type: 'int', nullable: true })
  sectionId: number | null

  @Column({ name: 'coverage_id', type: 'int', nullable: true })
  coverageId: number | null

  @Column({ name: 'coverage_detail_id', type: 'int', nullable: true })
  coverageDetailId: number | null

  @Column({ name: 'coverage_sub_type_id', type: 'int', nullable: true })
  coverageSubTypeId: number | null

  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId: number | null

  @Column({ name: 'rating_schedule_id', type: 'int', nullable: true })
  ratingScheduleId: number | null

  @Column({ name: 'rating_rule_id', type: 'int', nullable: true })
  ratingRuleId: number | null

  @Column({ name: 'sum_insured', type: 'numeric', precision: 15, scale: 2 })
  sumInsured: string

  @Column({ type: 'varchar', length: 3 })
  currency: string

  @Column({ name: 'rate_percentage', type: 'numeric', precision: 10, scale: 5 })
  ratePercentage: string

  @Column({ name: 'gross_annual_premium', type: 'numeric', precision: 15, scale: 2 })
  grossAnnualPremium: string

  @Column({ name: 'fixed_fees_total', type: 'numeric', precision: 15, scale: 2, default: 0 })
  fixedFeesTotal: string

  @Column({ name: 'discounts_total', type: 'numeric', precision: 15, scale: 2, default: 0 })
  discountsTotal: string

  @Column({ name: 'net_annual_premium', type: 'numeric', precision: 15, scale: 2 })
  netAnnualPremium: string

  @Column({ name: 'calculation_notes', type: 'text', nullable: true })
  calculationNotes: string | null

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt: Date

  @Column({ name: 'calculated_by', type: 'varchar', length: 255, nullable: true })
  calculatedBy: string | null

  @Column({ name: 'version_id', type: 'int', nullable: true })
  versionId: number | null
}

/**
 * LocationPremiumAdjustment entity — maps to `location_premium_adjustments`.
 * Schema source: db/schema/19-rating.js
 */
@Entity('location_premium_adjustments')
@Index('idx_loc_prem_adjustments_premium_id', ['locationPremiumId'])
export class LocationPremiumAdjustment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'location_premium_id', type: 'int' })
  locationPremiumId: number

  @Column({ name: 'adjustment_type', type: 'varchar', length: 20 })
  adjustmentType: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'numeric', precision: 8, scale: 5, nullable: true })
  percentage: string | null

  @Column({ name: 'fixed_amount', type: 'numeric', precision: 15, scale: 2, nullable: true })
  fixedAmount: string | null

  @Column({ name: 'calculated_amount', type: 'numeric', precision: 15, scale: 2 })
  calculatedAmount: string

  @Column({ name: 'applied_at_level', type: 'varchar', length: 50, nullable: true })
  appliedAtLevel: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null
}

/**
 * RatingScheduleBindingAuthority entity — maps to `rating_schedule_binding_authorities`.
 * Schema source: db/schema/19-rating.js
 */
@Entity('rating_schedule_binding_authorities')
@Index('idx_rsba_schedule_id', ['ratingScheduleId'])
@Index('idx_rsba_ba_section_id', ['bindingAuthoritySectionId'])
export class RatingScheduleBindingAuthority {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'rating_schedule_id', type: 'int' })
  ratingScheduleId: number

  @Column({ name: 'binding_authority_id', type: 'int', nullable: true })
  bindingAuthorityId: number | null

  @Column({ name: 'binding_authority_section_id', type: 'int', nullable: true })
  bindingAuthoritySectionId: number | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null
}
