import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

/**
 * LookupBrokerSubmissionSource entity — maps to `lookup_broker_submission_sources`.
 * Source: backend/nest/src/migrations/1747100000000-CreateLookupBrokerSubmissionSources.ts
 *
 * Seeded values: 'manual', 'platform_shared'.
 */
@Entity('lookup_broker_submission_sources')
export class LookupBrokerSubmissionSource {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
