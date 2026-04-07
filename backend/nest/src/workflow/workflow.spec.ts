import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { WorkflowService } from './workflow.service'
import { Submission } from '../entities/submission.entity'
import { ClearanceSubmission } from '../entities/clearance-submission.entity'
import { DataQualityIssue } from '../entities/data-quality-issue.entity'

const ORG = 'ORG1'
const OTHER_ORG = 'ORG2'

const SUBMISSION: Partial<Submission> = {
  id: 1, reference: 'SUB-001', insured: 'Acme Corp', placingBrokerName: 'BrokerCo',
  status: 'New', workflowStatusCode: null, createdByOrgCode: ORG, createdDate: '2025-01-01',
  submissionType: 'email',
}

const CLEARANCE: Partial<ClearanceSubmission> = {
  id: 1, orgCode: ORG, reference: 'SUB-001', insured: 'Acme Corp',
  inceptionDate: '2025-06-01', expiryDate: '2026-06-01',
  clearanceStatus: 'pending_clearance', clearedBy: null, clearedDate: null,
  assignedTo: null, createdDate: new Date(),
}

const DQ_ISSUE: Partial<DataQualityIssue> = {
  id: 1, orgCode: ORG, entityType: 'submission', entityReference: 'SUB-001',
  entityId: 1, field: 'insured', issueDescription: 'Insured name missing', severity: 'High',
}

describe('WorkflowService', () => {
  let service: WorkflowService
  let submissionRepo: any
  let clearanceRepo: any
  let dqRepo: any

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(Submission), useValue: mockRepo() },
        { provide: getRepositoryToken(ClearanceSubmission), useValue: mockRepo() },
        { provide: getRepositoryToken(DataQualityIssue), useValue: mockRepo() },
      ],
    }).compile()

    service = module.get(WorkflowService)
    submissionRepo = module.get(getRepositoryToken(Submission))
    clearanceRepo = module.get(getRepositoryToken(ClearanceSubmission))
    dqRepo = module.get(getRepositoryToken(DataQualityIssue))
  })

  // ---------------------------------------------------------------------------
  // getWorkflowSubmissions
  // ---------------------------------------------------------------------------
  describe('getWorkflowSubmissions', () => {
    it('maps submissions to workflow view with correct shape', async () => {
      submissionRepo.find.mockResolvedValue([SUBMISSION])

      const result = await service.getWorkflowSubmissions(ORG)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        reference: 'SUB-001',
        insured: 'Acme Corp',
        broker: 'BrokerCo',
        status: 'Unassigned',
      })
    })

    it('maps workflowStatusCode=assigned to status Assigned', async () => {
      submissionRepo.find.mockResolvedValue([{ ...SUBMISSION, workflowStatusCode: 'assigned' }])

      const result = await service.getWorkflowSubmissions(ORG)

      expect(result[0].status).toBe('Assigned')
    })

    it('maps workflowStatusCode=in_review to status In Review', async () => {
      submissionRepo.find.mockResolvedValue([{ ...SUBMISSION, workflowStatusCode: 'in_review' }])
      const result = await service.getWorkflowSubmissions(ORG)
      expect(result[0].status).toBe('In Review')
    })

    it('returns empty array when no submissions', async () => {
      submissionRepo.find.mockResolvedValue([])
      const result = await service.getWorkflowSubmissions(ORG)
      expect(result).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // assignSubmission
  // ---------------------------------------------------------------------------
  describe('assignSubmission', () => {
    it('sets workflowStatusCode to assigned and returns assignedTo', async () => {
      submissionRepo.findOne.mockResolvedValue({ ...SUBMISSION })
      submissionRepo.save.mockResolvedValue({ ...SUBMISSION, workflowStatusCode: 'assigned' })

      const result = await service.assignSubmission(ORG, 1, { assigned_to: 42 })

      expect(submissionRepo.save).toHaveBeenCalled()
      expect(result).toEqual({ assignedTo: '42' })
    })

    it('throws NotFoundException when submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null)
      await expect(service.assignSubmission(ORG, 999, {})).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // updateSubmissionStatus
  // ---------------------------------------------------------------------------
  describe('updateSubmissionStatus', () => {
    it('updates status and returns workflow view', async () => {
      submissionRepo.findOne.mockResolvedValue({ ...SUBMISSION })
      submissionRepo.save.mockResolvedValue({ ...SUBMISSION, status: 'Quoted' })

      const result = await service.updateSubmissionStatus(ORG, 1, { status: 'Quoted' })

      expect(submissionRepo.save).toHaveBeenCalled()
      expect(result).toMatchObject({ id: 1, reference: 'SUB-001' })
    })

    it('throws NotFoundException when submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null)
      await expect(service.updateSubmissionStatus(ORG, 999, { status: 'Quoted' })).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // getClearancePending
  // ---------------------------------------------------------------------------
  describe('getClearancePending', () => {
    it('returns pending clearance records for the org', async () => {
      clearanceRepo.find.mockResolvedValue([CLEARANCE])

      const result = await service.getClearancePending(ORG)

      expect(result).toHaveLength(1)
      expect(clearanceRepo.find).toHaveBeenCalledWith({
        where: { orgCode: ORG, clearanceStatus: 'pending_clearance' },
        order: { createdDate: 'DESC' },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // checkDuplicates
  // ---------------------------------------------------------------------------
  describe('checkDuplicates', () => {
    it('returns matches from same org excluding the target record', async () => {
      clearanceRepo.findOne.mockResolvedValue({ ...CLEARANCE })

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 2, reference: 'SUB-002', insured: 'Acme Corp', clearanceStatus: 'pending_clearance' },
        ]),
      }
      clearanceRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.checkDuplicates(ORG, 1)

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]).toMatchObject({ id: 2, reference: 'SUB-002' })
    })

    it('throws NotFoundException when clearance record not found', async () => {
      clearanceRepo.findOne.mockResolvedValue(null)
      await expect(service.checkDuplicates(ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // clearSubmission
  // ---------------------------------------------------------------------------
  describe('clearSubmission', () => {
    it('sets clearance_status to cleared and sets cleared_date', async () => {
      const record = { ...CLEARANCE }
      clearanceRepo.findOne.mockResolvedValue(record)
      clearanceRepo.save.mockResolvedValue({ ...record, clearanceStatus: 'cleared', clearedDate: new Date() })

      const result = await service.clearSubmission(ORG, 1)

      expect(clearanceRepo.save).toHaveBeenCalled()
      expect(result.clearanceStatus).toBe('cleared')
    })

    it('throws NotFoundException when clearance record not found', async () => {
      clearanceRepo.findOne.mockResolvedValue(null)
      await expect(service.clearSubmission(ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // confirmDuplicate
  // ---------------------------------------------------------------------------
  describe('confirmDuplicate', () => {
    it('sets clearance_status to confirmed_duplicate', async () => {
      const record = { ...CLEARANCE }
      clearanceRepo.findOne.mockResolvedValue(record)
      clearanceRepo.save.mockResolvedValue({
        ...record,
        clearanceStatus: 'confirmed_duplicate',
        clearedDate: new Date(),
      })

      const result = await service.confirmDuplicate(ORG, 1)

      expect(clearanceRepo.save).toHaveBeenCalled()
      expect(result.clearanceStatus).toBe('confirmed_duplicate')
    })

    it('throws NotFoundException when record not found', async () => {
      clearanceRepo.findOne.mockResolvedValue(null)
      await expect(service.confirmDuplicate(ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // getDataQualityIssues
  // ---------------------------------------------------------------------------
  describe('getDataQualityIssues', () => {
    it('returns data quality issues for the org', async () => {
      dqRepo.find.mockResolvedValue([DQ_ISSUE])

      const result = await service.getDataQualityIssues(ORG)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 1, entityType: 'submission', severity: 'High' })
    })

    it('returns empty array when no issues', async () => {
      dqRepo.find.mockResolvedValue([])
      const result = await service.getDataQualityIssues(ORG)
      expect(result).toEqual([])
    })
  })
})
