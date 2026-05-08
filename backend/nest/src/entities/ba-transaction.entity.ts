import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * BATransaction entity — maps to `binding_authority_transactions` table.
 * Schema source: db/migrations/017-create-binding-authority-transactions-table.js
 */
@Entity('binding_authority_transactions')
@Index('idx_ba_transactions_ba_id', ['bindingAuthorityId'])
export class BATransaction {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'binding_authority_id', type: 'int' })
  bindingAuthorityId: number

  @Column({ type: 'varchar', length: 50 })
  type: string

  @Column({ type: 'varchar', length: 50 })
  status: string

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'created_by_org_code', type: 'varchar', length: 50, nullable: true })
  createdByOrgCode: string | null
}
