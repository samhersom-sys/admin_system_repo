import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * Lookup entities — one class per lookup table.
 * Schema source: db/schema/18-lookups.js
 *
 * All 27 lookup tables are defined here. They share similar shapes but are kept
 * as separate classes so TypeORM registers them as distinct tables.
 */

// Standard status-code tables (4 tables)

@Entity('lookup_submission_statuses')
export class LookupSubmissionStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_quote_statuses')
export class LookupQuoteStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_policy_statuses')
export class LookupPolicyStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_policy_version_statuses')
export class LookupPolicyVersionStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_binding_authority_statuses')
export class LookupBindingAuthorityStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

// Simple name-only lookup tables

@Entity('lookup_contract_types')
export class LookupContractType {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_methods_of_placement')
export class LookupMethodOfPlacement {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_renewal_statuses')
export class LookupRenewalStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_transaction_types')
export class LookupTransactionType {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_loss_qualifiers')
export class LookupLossQualifier {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_claim_statuses')
export class LookupClaimStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

// Richer lookup tables

@Entity('lookup_classes_of_business')
@Index('idx_lookup_classes_of_business_code', ['code'])
export class LookupClassOfBusiness {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text', unique: true }) code: string
  @Column({ type: 'text' }) name: string
  @Column({ type: 'boolean', default: true }) active: boolean
  @Column({ name: 'requires_locations_schedule', type: 'boolean', default: false }) requiresLocationsSchedule: boolean
  @Column({ type: 'jsonb', default: '{}' }) payload: Record<string, unknown>
}

@Entity('lookup_basis_for_order')
export class LookupBasisForOrder {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'text' }) name: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_analysis_basis')
export class LookupAnalysisBasis {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'field_id', type: 'text', unique: true }) fieldId: string
  @Column({ type: 'text' }) label: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_date_basis')
@Index('idx_lookup_date_basis_domain', ['domain'])
export class LookupDateBasis {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'field_id', type: 'text', unique: true }) fieldId: string
  @Column({ type: 'text' }) label: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ type: 'text' }) domain: string
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_workflow_statuses')
export class LookupWorkflowStatus {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ type: 'varchar', length: 50, nullable: true }) category: string | null
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_party_roles')
export class LookupPartyRole {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 50, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

// Coverage hierarchy

@Entity('lookup_coverages')
@Index('idx_lookup_coverages_class', ['classOfBusiness'])
export class LookupCoverage {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'class_of_business', type: 'text' }) classOfBusiness: string
  @Column({ type: 'text', nullable: true }) code: string | null
  @Column({ type: 'text' }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ type: 'boolean', default: true }) active: boolean
  @Column({ name: 'display_order', type: 'int', nullable: true }) displayOrder: number | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_coverage_detail_types')
@Index('idx_lookup_coverage_detail_types_coverage', ['coverageId'])
export class LookupCoverageDetailType {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'coverage_id', type: 'int', nullable: true }) coverageId: number | null
  @Column({ name: 'class_of_business', type: 'text' }) classOfBusiness: string
  @Column({ type: 'text', nullable: true }) code: string | null
  @Column({ type: 'text' }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ type: 'boolean', default: true }) active: boolean
  @Column({ name: 'display_order', type: 'int', nullable: true }) displayOrder: number | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_coverage_detail_sub_types')
@Index('idx_lookup_coverage_detail_sub_types_detail', ['coverageDetailTypeId'])
export class LookupCoverageDetailSubType {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'coverage_detail_type_id', type: 'int', nullable: true }) coverageDetailTypeId: number | null
  @Column({ type: 'text', nullable: true }) code: string | null
  @Column({ type: 'text' }) name: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ type: 'boolean', default: true }) active: boolean
  @Column({ name: 'display_order', type: 'int', nullable: true }) displayOrder: number | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

// Geographic and financial lookup tables

@Entity('lookup_currencies')
export class LookupCurrency {
  @PrimaryColumn({ type: 'varchar', length: 8 }) code: string
  @Column({ type: 'text', nullable: true }) name: string | null
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
}

@Entity('lookup_countries')
@Index('idx_lookup_countries_code', ['code'])
export class LookupCountry {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 3, unique: true }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_regions')
@Index('idx_lookup_regions_country_code', ['countryCode'])
export class LookupRegion {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'country_code', type: 'varchar', length: 3 }) countryCode: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_subdivisions')
@Index('idx_lookup_subdivisions_country_code', ['countryCode'])
export class LookupSubdivision {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'country_code', type: 'varchar', length: 3 }) countryCode: string
  @Column({ type: 'varchar', length: 10 }) code: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ type: 'varchar', length: 100, nullable: true }) region: string | null
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_sic_codes')
@Index('idx_lookup_sic_codes_country_code', ['countryCode'])
export class LookupSicCode {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'country_code', type: 'varchar', length: 3 }) countryCode: string
  @Column({ type: 'varchar', length: 20 }) code: string
  @Column({ type: 'text' }) description: string
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_risk_codes')
@Index('idx_lookup_risk_codes_code', ['code'])
export class LookupRiskCode {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 20, unique: true }) code: string
  @Column({ type: 'text', nullable: true }) description: string | null
  @Column({ name: 'first_year_of_account', type: 'int', nullable: true }) firstYearOfAccount: number | null
  @Column({ name: 'last_year_of_account', type: 'int', nullable: true }) lastYearOfAccount: number | null
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_class_risk_codes')
export class LookupClassRiskCode {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'varchar', length: 20, unique: true }) code: string
  @Column({ type: 'text' }) description: string
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('lookup_tax_rules')
@Index('idx_lookup_tax_rules_country_code', ['countryCode'])
export class LookupTaxRule {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'tax_id', type: 'varchar', length: 50, unique: true }) taxId: string
  @Column({ type: 'varchar', length: 100 }) name: string
  @Column({ name: 'country_code', type: 'varchar', length: 3 }) countryCode: string
  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true }) stateCode: string | null
  @Column({ type: 'varchar', length: 100, nullable: true }) city: string | null
  @Column({ name: 'line_of_business', type: 'varchar', length: 50, default: 'ANY' }) lineOfBusiness: string
  @Column({ name: 'tax_type', type: 'varchar', length: 50 }) taxType: string
  @Column({ type: 'varchar', length: 20 }) base: string
  @Column({ name: 'rate_percent', type: 'numeric', precision: 10, scale: 4 }) ratePercent: string
  @Column({ name: 'fixed_amount', type: 'numeric', precision: 15, scale: 2, default: 0 }) fixedAmount: string
  @Column({ name: 'min_amount', type: 'numeric', precision: 15, scale: 2, nullable: true }) minAmount: string | null
  @Column({ name: 'max_amount', type: 'numeric', precision: 15, scale: 2, nullable: true }) maxAmount: string | null
  @Column({ name: 'effective_from', type: 'date' }) effectiveFrom: string
  @Column({ name: 'effective_to', type: 'date', nullable: true }) effectiveTo: string | null
  @Column({ type: 'text', nullable: true }) notes: string | null
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

// System error catalog — static reference table for standard error codes
// Schema source: db/seeds/023-system-error-catalog.js

@Entity('system_error_catalog')
export class SystemErrorCatalog {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'error_code', type: 'varchar', length: 50, unique: true }) errorCode: string
  @Column({ type: 'varchar', length: 50, nullable: true }) category: string | null
  @Column({ type: 'varchar', length: 20, nullable: true }) severity: string | null
  @Column({ name: 'message_template', type: 'text', nullable: true }) messageTemplate: string | null
  @Column({ name: 'resolution_hint', type: 'text', nullable: true }) resolutionHint: string | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}
