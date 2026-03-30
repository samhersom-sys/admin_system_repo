import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm'

/**
 * Party entity — maps to the `party` table.
 * Schema source:
 *   db/migrations/002-create-parties-table.js              (base table)
 *   db/migrations/004-alter-parties-add-extended-fields.js (contact + classification fields)
 *   db/migrations/007-alter-party-add-self-link.js         (party_created_id)
 *   db/migrations/061-alter-party-add-role-code-fk.js      (role_code)
 *
 * Note: column names use quoted camelCase in Postgres (e.g. "orgCode", "createdBy").
 * TypeORM maps camelCase property names to the quoted DB columns via `name`.
 */
@Entity('party')
@Index('idx_party_org_role', ['orgCode', 'role'])
@Index('idx_party_name', ['name'])
@Index('idx_party_city', ['city'])
export class Party {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 100 })
  role: string

  @Column({ name: 'orgCode', type: 'varchar', length: 100 })
  orgCode: string

  @Column({ name: 'createdBy', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'createdDate', type: 'timestamptz', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  createdDate: Date | null

  // Extended contact fields (migration 004)
  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ type: 'text', nullable: true })
  email: string | null

  @Column({ type: 'text', nullable: true })
  phone: string | null

  @Column({ name: 'addressLine1', type: 'text', nullable: true })
  addressLine1: string | null

  @Column({ name: 'addressLine2', type: 'text', nullable: true })
  addressLine2: string | null

  @Column({ name: 'addressLine3', type: 'text', nullable: true })
  addressLine3: string | null

  @Column({ type: 'text', nullable: true })
  city: string | null

  @Column({ type: 'text', nullable: true })
  state: string | null

  @Column({ type: 'text', nullable: true })
  postcode: string | null

  @Column({ type: 'text', nullable: true })
  country: string | null

  @Column({ type: 'text', nullable: true })
  region: string | null

  // Financial / industry classification fields (migration 004)
  @Column({ name: 'wageRoll', type: 'numeric', precision: 18, scale: 2, nullable: true })
  wageRoll: string | null

  @Column({ name: 'numberEmployees', type: 'int', nullable: true })
  numberEmployees: number | null

  @Column({ name: 'annualRevenue', type: 'numeric', precision: 18, scale: 2, nullable: true })
  annualRevenue: string | null

  @Column({ name: 'sicStandard', type: 'text', nullable: true })
  sicStandard: string | null

  @Column({ name: 'sicCode', type: 'text', nullable: true })
  sicCode: string | null

  @Column({ name: 'sicDescription', type: 'text', nullable: true })
  sicDescription: string | null

  // Self-link (migration 007)
  @Column({ name: 'party_created_id', type: 'int', nullable: true })
  partyCreatedId: number | null

  // Role code FK (migration 061)
  @Column({ name: 'role_code', type: 'text', nullable: true })
  roleCode: string | null
}
