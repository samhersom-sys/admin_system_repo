import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('finance_invoices')
@Index('idx_finance_invoices_org', ['orgCode'])
export class FinanceInvoice {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null

  @Column({ name: 'policy_reference', type: 'varchar', length: 200, nullable: true })
  policyReference: string | null

  @Column({ name: 'policy_id', type: 'int', nullable: true })
  policyId: number | null

  @Column({ name: 'insured_name', type: 'varchar', length: 500, nullable: true })
  insuredName: string | null

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  amount: number | null

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  outstanding: number | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: string | null

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
