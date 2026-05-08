import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * MeasureDefinitionHistory entity — maps to `measure_definition_history`.
 * Schema source: db/schema/27-measures.js
 *
 * Audit trail for changes to measure_definitions.
 */
@Entity('measure_definition_history')
@Index('idx_measure_definition_history_measure_id', ['measureDefinitionId'])
@Index('idx_measure_definition_history_changed_at', ['changedAt'])
export class MeasureDefinitionHistory {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'measure_definition_id', type: 'int' })
  measureDefinitionId: number

  @Column({ name: 'field_changed', type: 'varchar', length: 100 })
  fieldChanged: string

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string | null

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string | null

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date

  @Column({ name: 'changed_by', type: 'varchar', length: 255 })
  changedBy: string
}
