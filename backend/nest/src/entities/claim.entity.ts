import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * Claim entity — maps to the `claims` table.
 * Schema source: db/migrations/010-create-claims-table.js
 */
@Entity('claims')
@Index('idx_claims_policy_id', ['policyId'])
@Index('idx_claims_status', ['status'])
export class Claim {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_id', type: 'int' })
  policyId: number

  @Column({ name: 'claim_number', type: 'text' })
  claimNumber: string

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ type: 'text', default: 'Open' })
  status: string

  @Column({ name: 'loss_date', type: 'date', nullable: true })
  lossDate: string | null

  @Column({ name: 'reported_date', type: 'date', nullable: true })
  reportedDate: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
