import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * BindingAuthoritySectionParticipation entity — maps to `binding_authority_section_participations`.
 * Schema source: db/schema/21-participations.js
 */
@Entity('binding_authority_section_participations')
@Index('idx_ba_section_participations_section', ['bindingAuthoritySectionId'])
@Index('idx_ba_section_participations_market', ['marketPartyId'])
@Index('idx_ba_section_participations_entity', ['entityId'])
export class BindingAuthoritySectionParticipation {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'binding_authority_section_id', type: 'int' })
  bindingAuthoritySectionId: number

  @Column({ name: 'market_party_id', type: 'int', nullable: true })
  marketPartyId: number | null

  @Column({ name: 'market_name', type: 'text', nullable: true })
  marketName: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string | null

  @Column({ name: 'share_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  sharePct: string

  @Column({ name: 'agreement_party', type: 'text', nullable: true })
  agreementParty: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null

  @Column({ name: 'entity_name', type: 'text', nullable: true })
  entityName: string | null

  @Column({ name: 'written_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  writtenLinePct: string

  @Column({ name: 'signed_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  signedLinePct: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null
}

/**
 * QuoteSectionParticipation entity — maps to `quote_section_participations`.
 * Schema source: db/schema/21-participations.js
 */
@Entity('quote_section_participations')
@Index('idx_quote_section_participations_section', ['quoteSectionId'])
@Index('idx_quote_section_participations_market', ['marketPartyId'])
export class QuoteSectionParticipation {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'quote_section_id', type: 'int' })
  quoteSectionId: number

  @Column({ name: 'market_party_id', type: 'int', nullable: true })
  marketPartyId: number | null

  @Column({ name: 'market_name', type: 'text', nullable: true })
  marketName: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string | null

  @Column({ name: 'share_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  sharePct: string

  @Column({ name: 'agreement_party', type: 'text', nullable: true })
  agreementParty: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null

  @Column({ name: 'entity_name', type: 'text', nullable: true })
  entityName: string | null

  @Column({ name: 'written_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  writtenLinePct: string

  @Column({ name: 'signed_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  signedLinePct: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null
}

/**
 * PolicySectionParticipation entity — maps to `policy_section_participations`.
 * Schema source: db/schema/21-participations.js
 */
@Entity('policy_section_participations')
@Index('idx_policy_section_participations_section', ['policySectionId'])
@Index('idx_policy_section_participations_market', ['marketPartyId'])
export class PolicySectionParticipation {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_section_id', type: 'int' })
  policySectionId: number

  @Column({ name: 'market_party_id', type: 'int', nullable: true })
  marketPartyId: number | null

  @Column({ name: 'market_name', type: 'text', nullable: true })
  marketName: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string | null

  @Column({ name: 'share_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  sharePct: string

  @Column({ name: 'agreement_party', type: 'text', nullable: true })
  agreementParty: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null

  @Column({ name: 'entity_name', type: 'text', nullable: true })
  entityName: string | null

  @Column({ name: 'written_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  writtenLinePct: string

  @Column({ name: 'signed_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  signedLinePct: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null
}
