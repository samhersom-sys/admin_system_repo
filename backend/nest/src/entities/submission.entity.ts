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
 *   db/migrations/091-alter-submission-add-workflow-and-last-opened.js (workflow_status, workflow_assigned_to, last_opened_date)
 *   db/migrations/106-alter-submission-add-workflow-ai-fields.js (workflow_notes, ai pipeline cols)
 *   db/migrations/107-alter-submission-add-assignment-fields.js  (assigned_by, assigned_date)
 *   db/migrations/108-alter-submission-add-clearance-fields.js   (clearance columns)
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

  // Added in migration 091
  @Column({ name: 'workflow_status', type: 'varchar', length: 50, nullable: true })
  workflowStatus: string | null

  @Column({ name: 'workflow_assigned_to', type: 'int', nullable: true })
  workflowAssignedTo: number | null

  @Column({ name: 'last_opened_date', type: 'timestamp', nullable: true })
  lastOpenedDate: Date | null

  // Added in migration 106 — workflow notes and AI pipeline fields
  @Column({ name: 'workflow_notes', type: 'text', nullable: true })
  workflowNotes: string | null

  @Column({ name: 'ai_extracted', type: 'boolean', default: false })
  aiExtracted: boolean

  @Column({ name: 'review_required', type: 'boolean', default: false })
  reviewRequired: boolean

  @Column({ name: 'email_source', type: 'text', nullable: true })
  emailSource: string | null

  @Column({ name: 'email_received_date', type: 'timestamptz', nullable: true })
  emailReceivedDate: Date | null

  @Column({ name: 'email_processed_date', type: 'timestamptz', nullable: true })
  emailProcessedDate: Date | null

  @Column({ name: 'extraction_confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  extractionConfidence: string | null

  // Added in migration 107 — work-assignment fields
  @Column({ name: 'assigned_by', type: 'int', nullable: true })
  assignedBy: number | null

  @Column({ name: 'assigned_date', type: 'timestamptz', nullable: true })
  assignedDate: Date | null

  // Added in migration 108 — clearance workflow fields
  @Column({ name: 'clearance_status', type: 'text', nullable: true })
  clearanceStatus: string | null

  @Column({ name: 'clearance_status_code', type: 'varchar', length: 50, nullable: true })
  clearanceStatusCode: string | null

  @Column({ name: 'clearance_notes', type: 'text', nullable: true })
  clearanceNotes: string | null

  @Column({ name: 'clearance_matched_submissions', type: 'jsonb', nullable: true })
  clearanceMatchedSubmissions: Record<string, unknown>[] | null

  @Column({ name: 'clearance_reviewed_by', type: 'int', nullable: true })
  clearanceReviewedBy: number | null

  @Column({ name: 'clearance_reviewed_date', type: 'timestamptz', nullable: true })
  clearanceReviewedDate: Date | null

  @Column({ name: 'auto_clearance_checked', type: 'boolean', default: false })
  autoClearanceChecked: boolean
}
