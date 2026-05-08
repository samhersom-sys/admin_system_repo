import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * QuoteSectionRiskCode entity — maps to `quote_section_risk_codes`.
 * Schema source: db/schema/25-quote-extras.js
 */
@Entity('quote_section_risk_codes')
@Index('idx_quote_section_risk_codes_section_id', ['quoteSectionId'])
export class QuoteSectionRiskCode {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'quote_section_id', type: 'int' })
  quoteSectionId: number

  @Column({ type: 'text' })
  code: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
