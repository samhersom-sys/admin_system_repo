import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm'

/**
 * Submission entity — maps to the `submission` table.
 * Schema source:
 *   db/migrations/003-create-submission-table.js           (base table)
 *   db/migrations/005-alter-submission-add-party-link.js   (party_created_id)
 *   db/migrations/059-alter-submission-add-status-fk.js    (status_id)
 *   db/migrations/060-alter-submission-add-workflow-status-fk.js (workflow_status_code)
 *
 * Note: the table uses quoted camelCase column names for legacy fields.
 */
@Entity('submission')
@Index('idx_submission_org_code', ['createdByOrgCode'])
@Index('idx_submission_party_created', ['partyCreatedId'])
@Index('idx_submission_status_id', ['statusId'])
export class Submission {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: true })
  reference: string | null

  @Column({ name: 'submissionType', type: 'text', nullable: true })
  submissionType: string | null

  @Column({ type: 'text', nullable: true })
  insured: string | null

  @Column({ name: 'insuredId', type: 'text', nullable: true })
  insuredId: string | null

  @Column({ name: 'placingBroker', type: 'text', nullable: true })
  placingBroker: string | null

  @Column({ name: 'placingBrokerName', type: 'text', nullable: true })
  placingBrokerName: string | null

  @Column({ name: 'brokerId', type: 'int', nullable: true })
  brokerId: number | null

  @Column({ name: 'contractType', type: 'text', nullable: true })
  contractType: string | null

  @Column({ name: 'inceptionDate', type: 'text', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiryDate', type: 'text', nullable: true })
  expiryDate: string | null

  @Column({ name: 'renewalDate', type: 'text', nullable: true })
  renewalDate: string | null

  @Column({ type: 'text', nullable: true })
  status: string | null

  @Column({ name: 'createdDate', type: 'text', nullable: true })
  createdDate: string | null

  @Column({ name: 'createdBy', type: 'text', nullable: true })
  createdBy: string | null

  @Column({ name: 'createdByOrgCode', type: 'text', nullable: true })
  createdByOrgCode: string | null

  @Column({ name: 'invitedInsurers', type: 'text', nullable: true })
  invitedInsurers: string | null

  @Column({ name: 'inviteResponses', type: 'jsonb', nullable: true })
  inviteResponses: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  audit: Record<string, unknown> | null

  // Added in migration 005
  @Column({ name: 'party_created_id', type: 'int', nullable: true })
  partyCreatedId: number | null

  // Added in migration 059
  @Column({ name: 'status_id', type: 'int', nullable: true })
  statusId: number | null

  // Added in migration 060
  @Column({ name: 'workflow_status_code', type: 'varchar', length: 50, nullable: true })
  workflowStatusCode: string | null
}
