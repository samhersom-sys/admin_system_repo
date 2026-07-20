import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { BrokerSubmission } from '../entities/broker-submission.entity'
import { Organisation } from '../entities/organisation.entity'
import { LookupBrokerSubmissionSource } from '../entities/lookup-broker-submission-source.entity'

/**
 * BrokerSubmissionsService
 *
 * Domain: PSS-BRK-BE
 * Requirements: broker-submissions.requirements.md
 * Tests: broker-submissions.spec.ts
 *
 * Architectural rule (REQ-PSS-BRK-BE-C-001):
 *   This file MUST NOT import from SubmissionsModule or any other domain module.
 */

export interface CallerContext {
  orgCode: string
  userId: number
  /** Role from the JWT payload — used to allow internal_admin read-only oversight */
  role?: string
}

export interface CreateBrokerSubmissionInput {
  insuredName: string
  inceptionDate: string
  source: string
  reference?: string | null
  classOfBusiness?: string | null
  expiryDate?: string | null
  estimatedPremium?: number | null
  currency?: string | null
}

export interface BrokerSubmissionFilters {
  source?: string
  status?: string
}

@Injectable()
export class BrokerSubmissionsService {
  constructor(
    @InjectRepository(BrokerSubmission)
    private readonly subRepo: Repository<BrokerSubmission>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(LookupBrokerSubmissionSource)
    private readonly sourceRepo: Repository<LookupBrokerSubmissionSource>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  // ---------------------------------------------------------------------------
  // Guard — REQ-PSS-BRK-BE-S-001/002/007/008
  // ---------------------------------------------------------------------------

  private isPlatformAdmin(caller: CallerContext): boolean {
    return caller.role === 'internal_admin'
  }

  private async assertBrokerOrg(orgCode: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { orgCode } })
    if (!org || org.orgType !== 'broker') {
      throw new ForbiddenException('Only broker organisations can access broker submissions')
    }
  }

  /** Allows broker users or platform admins; throws ForbiddenException for all others */
  private async assertCanRead(caller: CallerContext): Promise<void> {
    if (this.isPlatformAdmin(caller)) return  // REQ-PSS-BRK-BE-S-007
    await this.assertBrokerOrg(caller.orgCode)
  }

  /** Allows broker users only; platform admins are explicitly rejected */
  private async assertCanWrite(caller: CallerContext): Promise<void> {
    if (this.isPlatformAdmin(caller)) {  // REQ-PSS-BRK-BE-S-008
      throw new ForbiddenException('Platform administrators cannot create or modify broker submissions')
    }
    await this.assertBrokerOrg(caller.orgCode)
  }

  // ---------------------------------------------------------------------------
  // Source validation — REQ-PSS-BRK-BE-C-002
  // ---------------------------------------------------------------------------

  private async assertValidSource(source: string): Promise<void> {
    const found = await this.sourceRepo.findOne({ where: { code: source, isActive: true } })
    if (!found) {
      throw new BadRequestException(`Invalid submission source: "${source}". Must be a value from lookup_broker_submission_sources`)
    }
  }

  // ---------------------------------------------------------------------------
  // Create — REQ-PSS-BRK-BE-F-001 to F-006
  // ---------------------------------------------------------------------------

  async create(input: CreateBrokerSubmissionInput, caller: CallerContext): Promise<BrokerSubmission> {
    // REQ-PSS-BRK-BE-S-001/002/008 — broker-only; admin rejected
    await this.assertCanWrite(caller)

    // REQ-PSS-BRK-BE-F-002
    if (!input.insuredName?.trim()) {
      throw new BadRequestException('insuredName is required')
    }

    // REQ-PSS-BRK-BE-F-003
    if (!input.inceptionDate?.trim()) {
      throw new BadRequestException('inceptionDate is required')
    }

    // REQ-PSS-BRK-BE-F-004 / C-002 — validate source against lookup table
    await this.assertValidSource(input.source)

    // REQ-PSS-BRK-BE-F-005 — status always 'Created'; F-006 — orgCode from caller
    const entity = this.subRepo.create({
      orgCode: caller.orgCode,                    // REQ-PSS-BRK-BE-F-006
      workflowStatus: 'Created',                  // REQ-PSS-BRK-BE-F-005
      insuredName: input.insuredName.trim(),
      inceptionDate: input.inceptionDate,
      source: input.source,
      reference: input.reference ?? null,
      classOfBusiness: input.classOfBusiness ?? null,
      expiryDate: input.expiryDate ?? null,
      estimatedPremium: input.estimatedPremium ?? null,
      currency: input.currency ?? 'USD',
      createdBy: caller.userId,
    })

    const saved = await this.subRepo.save(entity)

    // REQ-PSS-BRK-BE-S-005 — audit trail
    await this.writeAudit(saved.id, 'created', caller)

    return saved
  }

  // ---------------------------------------------------------------------------
  // Find one — REQ-PSS-BRK-BE-F-007/008, S-003
  // ---------------------------------------------------------------------------

  async findOne(id: number, caller: CallerContext): Promise<BrokerSubmission> {
    await this.assertCanRead(caller)  // REQ-PSS-BRK-BE-S-007

    // Tenant isolation for broker users; admin sees any submission
    const where: Record<string, unknown> = { id }
    if (!this.isPlatformAdmin(caller)) {
      where['orgCode'] = caller.orgCode  // REQ-PSS-BRK-BE-S-003
    }
    const sub = await this.subRepo.findOne({ where })
    if (!sub) {
      // REQ-PSS-BRK-BE-F-008 / S-003 — NotFoundException (not ForbiddenException)
      throw new NotFoundException(`Broker submission ${id} not found`)
    }
    return sub
  }

  // ---------------------------------------------------------------------------
  // Find all — REQ-PSS-BRK-BE-F-009 to F-012
  // ---------------------------------------------------------------------------

  async findAll(filters: BrokerSubmissionFilters, caller: CallerContext): Promise<BrokerSubmission[]> {
    await this.assertCanRead(caller)  // REQ-PSS-BRK-BE-S-007

    // Admin sees all orgs; broker users see only their own org
    const where: Record<string, unknown> = {}
    if (!this.isPlatformAdmin(caller)) {
      where['orgCode'] = caller.orgCode  // REQ-PSS-BRK-BE-S-003
    }
    if (filters.source) where['source'] = filters.source
    if (filters.status) where['workflowStatus'] = filters.status

    return this.subRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  // ---------------------------------------------------------------------------
  // Update — REQ-PSS-BRK-BE-F-013 to F-015
  // ---------------------------------------------------------------------------

  async update(id: number, patch: Partial<CreateBrokerSubmissionInput>, caller: CallerContext): Promise<BrokerSubmission> {
    await this.assertCanWrite(caller)  // REQ-PSS-BRK-BE-S-001/002/008 — broker-only

    const existing = await this.subRepo.findOne({ where: { id, orgCode: caller.orgCode } })
    if (!existing) {
      throw new NotFoundException(`Broker submission ${id} not found`)
    }

    // REQ-PSS-BRK-BE-F-014 — validate source if being changed
    if (patch.source !== undefined) {
      await this.assertValidSource(patch.source)
      existing.source = patch.source
    }

    if (patch.insuredName !== undefined) existing.insuredName = patch.insuredName
    if (patch.inceptionDate !== undefined) existing.inceptionDate = patch.inceptionDate
    if (patch.reference !== undefined) existing.reference = patch.reference ?? null
    if (patch.classOfBusiness !== undefined) existing.classOfBusiness = patch.classOfBusiness ?? null
    if (patch.expiryDate !== undefined) existing.expiryDate = patch.expiryDate ?? null
    if (patch.estimatedPremium !== undefined) existing.estimatedPremium = patch.estimatedPremium ?? null
    if (patch.currency !== undefined) existing.currency = patch.currency ?? null

    existing.updatedBy = caller.userId
    // REQ-PSS-BRK-BE-F-015 — updatedAt is set automatically by @UpdateDateColumn

    const saved = await this.subRepo.save(existing)

    // REQ-PSS-BRK-BE-S-006 — audit trail
    await this.writeAudit(saved.id, 'updated', caller)

    return saved
  }

  // ---------------------------------------------------------------------------
  // Audit — REQ-PSS-BRK-BE-S-005/006
  // ---------------------------------------------------------------------------

  private async writeAudit(submissionId: number, action: string, caller: CallerContext): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_event (entity_type, entity_id, action, user_id, user_name, created_by, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'BrokerSubmission',
          submissionId,
          action,
          caller.userId,
          String(caller.userId),
          String(caller.userId),
          JSON.stringify({ orgCode: caller.orgCode }),
        ],
      )
    } catch {
      // Audit failure must never block the primary operation
    }
  }
}
