import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * PolicyTransaction entity — maps to the `policy_transactions` table.
 * Schema source: db/schema/08-policy-transactions.js
 */
@Entity('policy_transactions')
@Index('idx_policy_transactions_policy_id', ['policyId'])
export class PolicyTransaction {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'policy_id', type: 'int' })
  policyId: number

  @Column({ name: 'transaction_type', type: 'varchar', length: 50 })
  transactionType: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
