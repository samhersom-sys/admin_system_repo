import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * Location entity — maps to the `locations` table.
 * Schema source: db/schema/20-locations.js
 */
@Entity('locations')
@Index('idx_locations_quote_id', ['quoteId'])
@Index('idx_locations_country_code', ['countryCode'])
export class Location {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'quote_id', type: 'int' })
  quoteId: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null

  @Column({ name: 'country_code', type: 'varchar', length: 3, nullable: true })
  countryCode: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null

  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true })
  stateCode: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  city: string | null

  @Column({ type: 'text', nullable: true })
  address1: string | null

  @Column({ type: 'text', nullable: true })
  address2: string | null

  @Column({ type: 'text', nullable: true })
  address3: string | null

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null
}

/**
 * LocationCoverage entity — maps to the `location_coverages` table.
 * Schema source: db/schema/20-locations.js
 */
@Entity('location_coverages')
@Index('idx_location_coverages_location', ['locationId'])
@Index('idx_location_coverages_quote', ['quoteId'])
@Index('idx_location_coverages_section', ['sectionId'])
@Index('idx_location_coverages_rating_schedule', ['ratingScheduleId'])
export class LocationCoverage {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'location_id', type: 'int' })
  locationId: number

  @Column({ name: 'quote_id', type: 'int' })
  quoteId: number

  @Column({ name: 'version_id', type: 'int' })
  versionId: number

  @Column({ name: 'section_id', type: 'int', nullable: true })
  sectionId: number | null

  @Column({ name: 'policy_id', type: 'int', nullable: true })
  policyId: number | null

  @Column({ name: 'coverage_type_id', type: 'int', nullable: true })
  coverageTypeId: number | null

  @Column({ name: 'coverage_sub_type_id', type: 'int', nullable: true })
  coverageSubTypeId: number | null

  @Column({ name: 'coverage_type', type: 'text', nullable: true })
  coverageType: string | null

  @Column({ name: 'coverage_sub_type', type: 'text', nullable: true })
  coverageSubType: string | null

  @Column({ type: 'varchar', length: 8, default: 'GBP' })
  currency: string

  @Column({ name: 'sum_insured', type: 'numeric', precision: 15, scale: 2, default: 0 })
  sumInsured: string

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  movement: string

  @Column({ name: 'is_bound', type: 'boolean', default: false })
  isBound: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null

  @Column({ name: 'base_rate', type: 'numeric', precision: 10, scale: 5, nullable: true })
  baseRate: string | null

  @Column({ name: 'final_rate', type: 'numeric', precision: 10, scale: 5, nullable: true })
  finalRate: string | null

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  premium: string | null

  @Column({ name: 'annual_rated_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualRatedGrossPremium: string | null

  @Column({ name: 'rating_schedule_id', type: 'int', nullable: true })
  ratingScheduleId: number | null

  @Column({ name: 'calculation_method', type: 'varchar', length: 50, nullable: true })
  calculationMethod: string | null

  @Column({ name: 'last_calculated', type: 'timestamptz', nullable: true })
  lastCalculated: Date | null
}

/**
 * LocationsScheduleVersion entity — maps to `locations_schedule_versions`.
 * Schema source: db/schema/20-locations.js
 */
@Entity('locations_schedule_versions')
@Index('idx_locations_schedule_versions_import', ['importId'])
export class LocationsScheduleVersion {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'import_id', type: 'int' })
  importId: number

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean
}

/**
 * PolicyLocationScheduleRow entity — maps to `policy_location_schedule_rows`.
 * Schema source: db/schema/20-locations.js
 */
@Entity('policy_location_schedule_rows')
@Index('idx_policy_location_schedule_rows_policy', ['policyId'])
@Index('idx_policy_location_schedule_rows_section', ['sectionId'])
export class PolicyLocationScheduleRow {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_id', type: 'int' })
  policyId: number

  @Column({ name: 'section_id', type: 'int', nullable: true })
  sectionId: number | null

  @Column({ type: 'int', default: 1 })
  version: number

  @Column({ type: 'text', nullable: true })
  country: string | null

  @Column({ name: 'country_code', type: 'varchar', length: 3, nullable: true })
  countryCode: string | null

  @Column({ type: 'text', nullable: true })
  state: string | null

  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true })
  stateCode: string | null

  @Column({ type: 'text', nullable: true })
  address1: string | null

  @Column({ type: 'text', nullable: true })
  address2: string | null

  @Column({ type: 'text', nullable: true })
  address3: string | null

  @Column({ type: 'text', nullable: true })
  city: string | null

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null

  @Column({ name: 'coverage_type', type: 'text', nullable: true })
  coverageType: string | null

  @Column({ name: 'coverage_sub_type', type: 'text', nullable: true })
  coverageSubType: string | null

  @Column({ name: 'coverage_type_id', type: 'int', nullable: true })
  coverageTypeId: number | null

  @Column({ name: 'coverage_sub_type_id', type: 'int', nullable: true })
  coverageSubTypeId: number | null

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured: string | null

  @Column({ type: 'varchar', length: 8, default: 'GBP' })
  currency: string

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  movement: string

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
}
