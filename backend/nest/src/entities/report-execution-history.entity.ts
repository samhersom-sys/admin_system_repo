import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm'

/**
 * ReportExecutionHistory entity — maps to the `report_execution_history` table.
 * Schema source: migrations/1740000000001-add-reporting-tables.ts
 *
 * Records every execution of a report template (success or error).
 */
@Entity('report_execution_history')
@Index('idx_report_exec_history_template', ['templateId'])
export class ReportExecutionHistory {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'template_id', type: 'int' })
    templateId: number

    @CreateDateColumn({ name: 'run_at', type: 'timestamptz' })
    runAt: Date

    @Column({ name: 'run_by', type: 'text', nullable: true })
    runBy: string | null

    @Column({ name: 'row_count', type: 'int', nullable: true })
    rowCount: number | null

    /** 'success' | 'error' */
    @Column({ type: 'text', default: 'success' })
    status: string
}
