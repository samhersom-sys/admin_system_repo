import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * AuditEvent entity — maps to the `audit_event` table.
 * Schema source: db/schema/04-core-audit.js
 */
@Entity('audit_event')
@Index('idx_audit_event_entity', ['entityType', 'entityId'])
@Index('idx_audit_event_user_action', ['userId', 'action'])
export class AuditEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string

  @Column({ name: 'entity_id', type: 'int' })
  entityId: number

  @Column({ type: 'text' })
  action: string

  @Column({ type: 'jsonb', default: '{}' })
  details: Record<string, unknown>

  @Column({ name: 'created_by', type: 'text', default: '' })
  createdBy: string

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null

  @Column({ name: 'user_name', type: 'text', default: '' })
  userName: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
