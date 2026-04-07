import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'

@Injectable()
export class BindingAuthoritiesService {
  constructor(
    @InjectRepository(BindingAuthority)
    private readonly baRepo: Repository<BindingAuthority>,
    @InjectRepository(BASection)
    private readonly sectionRepo: Repository<BASection>,
    @InjectRepository(BATransaction)
    private readonly transactionRepo: Repository<BATransaction>,
    @InjectRepository(BASectionParticipation)
    private readonly participationRepo: Repository<BASectionParticipation>,
    @InjectRepository(BASectionAuthorizedRisk)
    private readonly riskRepo: Repository<BASectionAuthorizedRisk>,
  ) { }

  // ---------------------------------------------------------------------------
  // Binding Authorities
  // ---------------------------------------------------------------------------

  async findAll(orgCode: string, search?: string): Promise<object[]> {
    const qb = this.baRepo
      .createQueryBuilder('ba')
      .where('ba.created_by_org_code = :orgCode', { orgCode })
      .orderBy('ba.created_at', 'DESC')

    if (search) {
      qb.andWhere('LOWER(ba.reference) LIKE :search', { search: `%${search.toLowerCase()}%` })
    }

    const rows = await qb.getMany()
    return rows.map(ba => this.toBAView(ba))
  }

  async findOne(orgCode: string, id: number): Promise<object> {
    const ba = await this.baRepo.findOne({ where: { id, createdByOrgCode: orgCode } })
    if (!ba) throw new NotFoundException(`Binding authority ${id} not found`)
    return this.toBAView(ba)
  }

  async create(orgCode: string, body: Record<string, unknown>, createdBy: string): Promise<object> {
    const payload: Record<string, unknown> = {
      coverholder_id: body.coverholder_id,
      coverholder: body.coverholder,
    }
    const entity = this.baRepo.create({
      reference: `BA-${Date.now()}`,
      status: 'Draft',
      inceptionDate: body.inception_date as string,
      expiryDate: body.expiry_date as string,
      yearOfAccount: body.year_of_account as number,
      createdByOrgCode: orgCode,
      createdBy,
      payload,
    })
    const saved = await this.baRepo.save(entity)
    return this.toBAView(saved)
  }

  async update(orgCode: string, id: number, body: Record<string, unknown>): Promise<object> {
    const existing = await this.baRepo.findOne({ where: { id, createdByOrgCode: orgCode } })
    if (!existing) throw new NotFoundException(`Binding authority ${id} not found`)

    if (body.status !== undefined) existing.status = body.status as string
    if (body.inception_date !== undefined) existing.inceptionDate = body.inception_date as string
    if (body.expiry_date !== undefined) existing.expiryDate = body.expiry_date as string
    if (body.year_of_account !== undefined) existing.yearOfAccount = body.year_of_account as number
    if (body.coverholder_id !== undefined || body.coverholder !== undefined) {
      existing.payload = {
        ...(existing.payload ?? {}),
        coverholder_id: body.coverholder_id ?? existing.payload?.coverholder_id,
        coverholder: body.coverholder ?? existing.payload?.coverholder,
      }
    }

    const saved = await this.baRepo.save(existing)
    return this.toBAView(saved)
  }

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  async getSections(orgCode: string, baId: number): Promise<object[]> {
    await this.assertBAOwnership(orgCode, baId)
    const sections = await this.sectionRepo.find({
      where: { bindingAuthorityId: baId },
      order: { createdAt: 'ASC' },
    })
    return sections.map(s => this.toSectionView(s))
  }

  async createSection(orgCode: string, baId: number, body: Record<string, unknown>): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const sectionCount = await this.sectionRepo.count({ where: { bindingAuthorityId: baId } })
    const entity = this.sectionRepo.create({
      bindingAuthorityId: baId,
      reference: `${baId}-S${sectionCount + 1}`,
      classOfBusiness: body.class_of_business as string,
      timeBasis: body.time_basis as string,
      inceptionDate: body.inception_date as string,
      expiryDate: body.expiry_date as string,
      daysOnCover: body.days_on_cover as number,
      limitAmount: body.written_premium_limit as number,
      limitCurrency: body.currency as string,
      payload: { line_size: body.line_size },
    })
    const saved = await this.sectionRepo.save(entity)
    return this.toSectionView(saved)
  }

  async updateSection(orgCode: string, sectionId: number, body: Record<string, unknown>): Promise<object> {
    const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
    if (!section) throw new NotFoundException(`Section ${sectionId} not found`)
    await this.assertBAOwnership(orgCode, section.bindingAuthorityId)

    if (body.class_of_business !== undefined) section.classOfBusiness = body.class_of_business as string
    if (body.time_basis !== undefined) section.timeBasis = body.time_basis as string
    if (body.inception_date !== undefined) section.inceptionDate = body.inception_date as string
    if (body.expiry_date !== undefined) section.expiryDate = body.expiry_date as string
    if (body.written_premium_limit !== undefined) section.limitAmount = body.written_premium_limit as number
    if (body.currency !== undefined) section.limitCurrency = body.currency as string
    if (body.line_size !== undefined) {
      section.payload = { ...(section.payload ?? {}), line_size: body.line_size }
    }

    const saved = await this.sectionRepo.save(section)
    return this.toSectionView(saved)
  }

  async deleteSection(orgCode: string, sectionId: number): Promise<void> {
    const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
    if (!section) throw new NotFoundException(`Section ${sectionId} not found`)
    await this.assertBAOwnership(orgCode, section.bindingAuthorityId)
    await this.sectionRepo.remove(section)
  }

  // ---------------------------------------------------------------------------
  // Participations
  // ---------------------------------------------------------------------------

  async getParticipations(orgCode: string, sectionId: number): Promise<object[]> {
    await this.assertSectionOwnership(orgCode, sectionId)
    const rows = await this.participationRepo.find({ where: { bindingAuthoritySectionId: sectionId } })
    return rows.map(p => this.toParticipationView(p))
  }

  async saveParticipations(orgCode: string, sectionId: number, rows: Record<string, unknown>[]): Promise<object[]> {
    await this.assertSectionOwnership(orgCode, sectionId)
    await this.participationRepo.delete({ bindingAuthoritySectionId: sectionId })
    const entities = rows.map(r =>
      this.participationRepo.create({
        bindingAuthoritySectionId: sectionId,
        marketName: r.syndicate as string,
        sharePct: Number(r.share_percent ?? 0),
        role: r.role as string,
      }),
    )
    const saved = await this.participationRepo.save(entities)
    return saved.map(p => this.toParticipationView(p))
  }

  // ---------------------------------------------------------------------------
  // Authorized Risk Codes
  // ---------------------------------------------------------------------------

  async getAuthorizedRiskCodes(orgCode: string, sectionId: number): Promise<string[]> {
    await this.assertSectionOwnership(orgCode, sectionId)
    const rows = await this.riskRepo.find({ where: { sectionId } })
    return rows.map(r => r.riskCode)
  }

  async addAuthorizedRiskCode(orgCode: string, sectionId: number, code: string): Promise<void> {
    await this.assertSectionOwnership(orgCode, sectionId)
    const existing = await this.riskRepo.findOne({ where: { sectionId, riskCode: code } })
    if (!existing) {
      const entity = this.riskRepo.create({ sectionId, riskCode: code })
      await this.riskRepo.save(entity)
    }
  }

  async removeAuthorizedRiskCode(orgCode: string, sectionId: number, code: string): Promise<void> {
    await this.assertSectionOwnership(orgCode, sectionId)
    await this.riskRepo.delete({ sectionId, riskCode: code })
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async getTransactions(orgCode: string, baId: number): Promise<object[]> {
    await this.assertBAOwnership(orgCode, baId)
    const rows = await this.transactionRepo.find({
      where: { bindingAuthorityId: baId },
      order: { createdAt: 'DESC' },
    })
    return rows.map(t => this.toTransactionView(t))
  }

  async createTransaction(orgCode: string, baId: number, body: Record<string, unknown>, createdBy: string): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const entity = this.transactionRepo.create({
      bindingAuthorityId: baId,
      type: body.type as string,
      status: 'draft',
      effectiveDate: body.date as string,
      description: body.description as string,
      payload: { amount: body.amount, currency: body.currency },
      createdBy,
      createdByOrgCode: orgCode,
    })
    const saved = await this.transactionRepo.save(entity)
    return this.toTransactionView(saved)
  }

  async updateTransaction(orgCode: string, baId: number, transId: number, body: Record<string, unknown>): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const tx = await this.transactionRepo.findOne({ where: { id: transId, bindingAuthorityId: baId } })
    if (!tx) throw new NotFoundException(`Transaction ${transId} not found`)

    if (body.type !== undefined) tx.type = body.type as string
    if (body.date !== undefined) tx.effectiveDate = body.date as string
    if (body.description !== undefined) tx.description = body.description as string
    if (body.amount !== undefined || body.currency !== undefined) {
      tx.payload = {
        ...(tx.payload ?? {}),
        amount: body.amount ?? tx.payload?.amount,
        currency: body.currency ?? tx.payload?.currency,
      }
    }

    const saved = await this.transactionRepo.save(tx)
    return this.toTransactionView(saved)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async assertBAOwnership(orgCode: string, baId: number): Promise<BindingAuthority> {
    const ba = await this.baRepo.findOne({ where: { id: baId, createdByOrgCode: orgCode } })
    if (!ba) throw new NotFoundException(`Binding authority ${baId} not found`)
    return ba
  }

  private async assertSectionOwnership(orgCode: string, sectionId: number): Promise<BASection> {
    const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
    if (!section) throw new NotFoundException(`Section ${sectionId} not found`)
    await this.assertBAOwnership(orgCode, section.bindingAuthorityId)
    return section
  }

  private toBAView(ba: BindingAuthority): object {
    return {
      id: ba.id,
      reference: ba.reference,
      status: ba.status,
      inception_date: ba.inceptionDate,
      expiry_date: ba.expiryDate,
      year_of_account: ba.yearOfAccount,
      submission_id: ba.submissionId,
      multi_year: ba.isMultiYear,
      coverholder_id: ba.payload?.coverholder_id ?? null,
      coverholder: ba.payload?.coverholder ?? null,
      created_at: ba.createdAt,
    }
  }

  private toSectionView(s: BASection): object {
    return {
      id: s.id,
      binding_authority_id: s.bindingAuthorityId,
      reference: s.reference,
      class_of_business: s.classOfBusiness,
      time_basis: s.timeBasis,
      inception_date: s.inceptionDate,
      expiry_date: s.expiryDate,
      days_on_cover: s.daysOnCover,
      written_premium_limit: s.limitAmount,
      currency: s.limitCurrency,
      line_size: s.payload?.line_size ?? null,
    }
  }

  private toParticipationView(p: BASectionParticipation): object {
    return {
      id: p.id,
      section_id: p.bindingAuthoritySectionId,
      syndicate: p.marketName,
      share_percent: Number(p.sharePct),
      role: p.role,
    }
  }

  private toTransactionView(t: BATransaction): object {
    return {
      id: t.id,
      binding_authority_id: t.bindingAuthorityId,
      type: t.type,
      amount: t.payload?.amount ?? null,
      currency: t.payload?.currency ?? null,
      date: t.effectiveDate,
      description: t.description,
    }
  }
}
