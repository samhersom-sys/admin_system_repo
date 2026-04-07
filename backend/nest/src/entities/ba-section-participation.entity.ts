import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * BASectionParticipation entity — maps to `binding_authority_section_participations` table.
 * Schema source: db/migrations/064-create-ba-section-participations-table.js
 *
 * Frontend field mapping:
 *   section_id    → binding_authority_section_id column
 *   syndicate     → market_name column
 *   share_percent → share_pct column
 */
@Entity('binding_authority_section_participations')
@Index('idx_ba_participations_section', ['bindingAuthoritySectionId'])
export class BASectionParticipation {
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
  sharePct: number

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
  writtenLinePct: number

  @Column({ name: 'signed_line_pct', type: 'numeric', precision: 10, scale: 6, default: 0 })
  signedLinePct: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
