import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * BASectionAuthorizedRisk entity — maps to `binding_authority_section_authorized_risks` table.
 * Schema source: db/migrations/018-create-ba-section-authorized-risks-table.js
 */
@Entity('binding_authority_section_authorized_risks')
@Index('idx_bas_auth_risks_section', ['sectionId'])
export class BASectionAuthorizedRisk {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number

  @Column({ name: 'risk_code', type: 'text' })
  riskCode: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
