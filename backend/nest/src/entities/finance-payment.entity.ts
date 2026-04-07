import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('finance_payments')
@Index('idx_finance_payments_org', ['orgCode'])
export class FinancePayment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string | null

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  amount: number | null

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  method: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null

  @Column({ type: 'date', nullable: true })
  date: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
