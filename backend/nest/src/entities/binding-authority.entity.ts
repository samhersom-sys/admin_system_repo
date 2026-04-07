import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * BindingAuthority entity — maps to `binding_authorities` table.
 * Schema source: db/migrations/015-create-binding-authorities-table.js
 *
 * `coverholder_id` and `coverholder` are stored in the `payload` JSONB column
 * and surfaced by the service layer for API responses.
 */
@Entity('binding_authorities')
@Index('idx_ba_org_code', ['createdByOrgCode'])
export class BindingAuthority {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'year_of_account', type: 'int', nullable: true })
  yearOfAccount: number | null

  @Column({ name: 'is_multi_year', type: 'boolean', default: false })
  isMultiYear: boolean

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null

  @Column({ name: 'created_by_org_code', type: 'varchar', length: 50, nullable: true })
  createdByOrgCode: string | null
}
