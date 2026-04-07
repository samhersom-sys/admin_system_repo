import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Submission } from '../entities/submission.entity'
import { ClearanceSubmission } from '../entities/clearance-submission.entity'
import { DataQualityIssue } from '../entities/data-quality-issue.entity'

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(ClearanceSubmission)
    private readonly clearanceRepo: Repository<ClearanceSubmission>,
    @InjectRepository(DataQualityIssue)
    private readonly dqRepo: Repository<DataQualityIssue>,
  ) { }

  async getWorkflowSubmissions(orgCode: string) {
    const rows = await this.submissionRepo.find({
      where: { createdByOrgCode: orgCode },
      order: { id: 'DESC' },
    })

    return rows.map(s => ({
      id: s.id,
      reference: s.reference,
      insured: s.insured,
      broker: s.placingBrokerName,
      email_received: s.createdDate,
      processed: null,
      status: this.mapStatus(s.workflowStatusCode ?? s.status),
      assigned_to: null,
      source: s.submissionType,
      ai_extracted: false,
      review_required: false,
    }))
  }

  async assignSubmission(orgCode: string, id: number, body: Record<string, unknown>) {
    const submission = await this.submissionRepo.findOne({ where: { id, createdByOrgCode: orgCode } })
    if (!submission) throw new NotFoundException(`Submission ${id} not found`)
    submission.workflowStatusCode = 'assigned'
    await this.submissionRepo.save(submission)
    return { assignedTo: String(body.assigned_to ?? '') }
  }

  async updateSubmissionStatus(orgCode: string, id: number, body: Record<string, unknown>) {
    const submission = await this.submissionRepo.findOne({ where: { id, createdByOrgCode: orgCode } })
    if (!submission) throw new NotFoundException(`Submission ${id} not found`)
    if (body.status) submission.status = String(body.status)
    await this.submissionRepo.save(submission)
    return this.toWorkflowView(submission)
  }

  async getClearancePending(orgCode: string): Promise<ClearanceSubmission[]> {
    return this.clearanceRepo.find({
      where: { orgCode, clearanceStatus: 'pending_clearance' },
      order: { createdDate: 'DESC' },
    })
  }

  async checkDuplicates(orgCode: string, id: number) {
    const target = await this.clearanceRepo.findOne({ where: { id, orgCode } })
    if (!target) throw new NotFoundException(`Clearance record ${id} not found`)

    const matches = await this.clearanceRepo
      .createQueryBuilder('c')
      .where('c.org_code = :orgCode', { orgCode })
      .andWhere('c.id != :id', { id })
      .andWhere('LOWER(c.insured) = LOWER(:insured)', { insured: target.insured ?? '' })
      .limit(10)
      .getMany()

    return {
      matches: matches.map(m => ({
        id: m.id,
        reference: m.reference,
        insured: m.insured,
        status: m.clearanceStatus,
      })),
    }
  }

  async clearSubmission(orgCode: string, id: number): Promise<ClearanceSubmission> {
    const record = await this.clearanceRepo.findOne({ where: { id, orgCode } })
    if (!record) throw new NotFoundException(`Clearance record ${id} not found`)
    record.clearanceStatus = 'cleared'
    record.clearedDate = new Date()
    return this.clearanceRepo.save(record)
  }

  async confirmDuplicate(orgCode: string, id: number): Promise<ClearanceSubmission> {
    const record = await this.clearanceRepo.findOne({ where: { id, orgCode } })
    if (!record) throw new NotFoundException(`Clearance record ${id} not found`)
    record.clearanceStatus = 'confirmed_duplicate'
    record.clearedDate = new Date()
    return this.clearanceRepo.save(record)
  }

  async getDataQualityIssues(orgCode: string): Promise<DataQualityIssue[]> {
    return this.dqRepo.find({ where: { orgCode }, order: { createdAt: 'DESC' } })
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapStatus(raw: string | null | undefined): string {
    if (!raw) return 'Unassigned'
    const map: Record<string, string> = {
      assigned: 'Assigned',
      in_review: 'In Review',
      quoted: 'Quoted',
      declined: 'Declined',
    }
    return map[raw.toLowerCase()] ?? 'Unassigned'
  }

  private toWorkflowView(s: Submission) {
    return {
      id: s.id,
      reference: s.reference,
      insured: s.insured,
      broker: s.placingBrokerName,
      email_received: s.createdDate,
      processed: null,
      status: this.mapStatus(s.workflowStatusCode ?? s.status),
      assigned_to: null,
      source: s.submissionType,
      ai_extracted: false,
      review_required: false,
    }
  }
}
