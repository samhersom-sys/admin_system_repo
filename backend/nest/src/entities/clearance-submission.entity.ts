import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('clearance_queue')
@Index('idx_clearance_queue_org', ['orgCode'])
@Index('idx_clearance_queue_status', ['clearanceStatus'])
export class ClearanceSubmission {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  insured: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'clearance_status', type: 'varchar', length: 50, default: 'pending_clearance' })
  clearanceStatus: string

  @Column({ name: 'cleared_by', type: 'varchar', length: 255, nullable: true })
  clearedBy: string | null

  @Column({ name: 'cleared_date', type: 'timestamptz', nullable: true })
  clearedDate: Date | null

  @Column({ name: 'assigned_to', type: 'varchar', length: 255, nullable: true })
  assignedTo: string | null

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date
}
