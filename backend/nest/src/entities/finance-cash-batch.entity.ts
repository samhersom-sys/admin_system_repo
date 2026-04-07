import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('finance_cash_batches')
@Index('idx_finance_cash_batches_org', ['orgCode'])
export class FinanceCashBatch {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  amount: number | null

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  allocated: number

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  remaining: number | null

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: string

  @Column({ name: 'assigned_to', type: 'varchar', length: 255, nullable: true })
  assignedTo: string | null

  @Column({ name: 'created_date', type: 'timestamptz', default: () => 'NOW()' })
  createdDate: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
