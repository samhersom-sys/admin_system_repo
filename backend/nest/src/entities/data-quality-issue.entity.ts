import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('data_quality_issues')
@Index('idx_dq_issues_org', ['orgCode'])
export class DataQualityIssue {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType: string | null

  @Column({ name: 'entity_reference', type: 'varchar', length: 200, nullable: true })
  entityReference: string | null

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  field: string | null

  @Column({ name: 'issue_description', type: 'text', nullable: true })
  issueDescription: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  severity: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
