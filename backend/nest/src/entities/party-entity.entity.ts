import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PartyEntity entity — maps to the `party_entities` table.
 * Schema source: db/schema/21-participations.js
 *
 * Represents a specific underwriting entity (e.g. syndicate) belonging to a party.
 */
@Entity('party_entities')
@Index('idx_party_entities_party_id', ['partyId'])
export class PartyEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'party_id', type: 'int' })
  partyId: number

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null

  @Column({ name: 'entity_code', type: 'varchar', length: 50, nullable: true })
  entityCode: string | null

  @Column({ name: 'entity_type', type: 'varchar', length: 50, default: 'Syndicate' })
  entityType: string

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'boolean', default: true })
  active: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null
}
