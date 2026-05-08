import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'
import { BADocument } from '../entities/ba-document.entity'
import { BABordereauConfig } from '../entities/ba-bordereau-config.entity'
import { AuditService } from '../audit/audit.service'

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
    @InjectRepository(BADocument)
    private readonly docRepo: Repository<BADocument>,
    @InjectRepository(BABordereauConfig)
    private readonly bordereauConfigRepo: Repository<BABordereauConfig>,
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

    // REQ-BA-FE-F-134 — atomically create the Initial Transaction
    const initialTx = this.transactionRepo.create({
      bindingAuthorityId: saved.id,
      type: 'Initial Transaction',
      status: 'Draft',
      effectiveDate: body.inception_date as string,
      description: 'Opening transaction',
      createdBy,
      createdByOrgCode: orgCode,
      payload: {},
    })
    await this.transactionRepo.save(initialTx)

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

    // When BA is issued (status → Active), auto-issue the Initial Transaction as 'Issued'
    if (body.status === 'Active') {
      const initialTx = await this.transactionRepo.findOne({
        where: { bindingAuthorityId: id, type: 'Initial Transaction', status: 'Draft' },
      })
      if (initialTx) {
        const issuedSections = await this.sectionRepo.find({
          where: { bindingAuthorityId: id },
          order: { createdAt: 'ASC' },
        })
        initialTx.status = 'Issued'
        initialTx.payload = {
          ...(initialTx.payload ?? {}),
          details: {
            coverholder: existing.payload?.coverholder ?? null,
            coverholder_id: existing.payload?.coverholder_id ?? null,
            year_of_account: existing.yearOfAccount ?? null,
            inception_date: existing.inceptionDate ?? null,
            expiry_date: existing.expiryDate ?? null,
            sections: issuedSections.map(s => this.toSectionView(s)),
          },
        }
        await this.transactionRepo.save(initialTx)
      }
    }

    return this.toBAView(saved)
  }

  async getAudit(orgCode: string, baId: number): Promise<any[]> {
    await this.assertBAOwnership(orgCode, baId)
    return this.auditService.getHistory('Binding Authority', baId)
  }

  async postAudit(orgCode: string, baId: number, user: any, body: Record<string, unknown>): Promise<any> {
    await this.assertBAOwnership(orgCode, baId)
    return this.auditService.writeEvent({
      entityType: 'Binding Authority',
      entityId: baId,
      action: body.action,
      details: body.details,
    }, user)
  }

  async listClassesOfBusiness(): Promise<{ code: string; name: string }[]> {
    const rows = await this.baRepo.manager.query(
      `SELECT code, name
         FROM public.lookup_classes_of_business
        WHERE active = TRUE
        ORDER BY name ASC`,
    )
    return rows.map((row: { code: string; name: string }) => ({ code: row.code, name: row.name }))
  }

  async listCurrencies(): Promise<string[]> {
    const rows = await this.baRepo.manager.query(
      `SELECT code
         FROM public.lookup_currencies
        WHERE active = TRUE
        ORDER BY code ASC`,
    )
    return rows.map((row: { code: string }) => row.code)
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

  private nullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null
  }

  private nullableNumber(value: unknown): number | null {
    return typeof value === 'number' && !Number.isNaN(value) ? value : null
  }

  async createSection(orgCode: string, baId: number, body: Record<string, unknown>): Promise<object> {
    const ba = await this.assertBAOwnership(orgCode, baId)
    const sectionCount = await this.sectionRepo.count({ where: { bindingAuthorityId: baId } })
    const sectionSeq = String(sectionCount + 1).padStart(2, '0')
    const entity = this.sectionRepo.create({
      bindingAuthorityId: baId,
      reference: `${ba.reference}-S${sectionSeq}`,
      classOfBusiness: this.nullableString(body.class_of_business),
      classOfBusinessCode: this.nullableString(body.class_of_business_code),
      timeBasis: this.nullableString(body.time_basis),
      inceptionDate: this.nullableString(body.inception_date),
      expiryDate: this.nullableString(body.expiry_date),
      daysOnCover: this.nullableNumber(body.days_on_cover),
      limitAmount: this.nullableNumber(body.written_premium_limit),
      limitCurrency: this.nullableString(body.currency),
      payload: body.line_size === undefined ? {} : { line_size: body.line_size },
    })
    const saved = await this.sectionRepo.save(entity)
    return this.toSectionView(saved)
  }

  async updateSection(orgCode: string, sectionId: number, body: Record<string, unknown>): Promise<object> {
    const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
    if (!section) throw new NotFoundException(`Section ${sectionId} not found`)
    await this.assertBAOwnership(orgCode, section.bindingAuthorityId)

    if (body.class_of_business !== undefined) section.classOfBusiness = this.nullableString(body.class_of_business)
    if (body.class_of_business_code !== undefined) section.classOfBusinessCode = this.nullableString(body.class_of_business_code)
    if (body.time_basis !== undefined) section.timeBasis = this.nullableString(body.time_basis)
    if (body.inception_date !== undefined) section.inceptionDate = this.nullableString(body.inception_date)
    if (body.expiry_date !== undefined) section.expiryDate = this.nullableString(body.expiry_date)
    if (body.written_premium_limit !== undefined) section.limitAmount = this.nullableNumber(body.written_premium_limit)
    if (body.currency !== undefined) section.limitCurrency = this.nullableString(body.currency)
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

    // One open unissued endorsement allowed per type (Contractual or Administrative)
    const type = body.type as string
    if (type === 'Administrative' || type === 'Contractual') {
      const existing = await this.transactionRepo
        .createQueryBuilder('tx')
        .where('tx.binding_authority_id = :baId', { baId })
        .andWhere('tx.type = :type', { type })
        .andWhere("tx.status IN ('Draft', 'Bound')")
        .getOne()
      if (existing) {
        throw Object.assign(new Error(`An open ${type} endorsement already exists for this binding authority`), { statusCode: 400 })
      }
    }

    const entity = this.transactionRepo.create({
      bindingAuthorityId: baId,
      type,
      status: (body.status as string) ?? 'Draft',
      effectiveDate: (body.effective_date ?? body.date) as string,
      description: body.description as string,
      payload: {
        sub_type: body.sub_type ?? null,
      },
      createdBy,
      createdByOrgCode: orgCode,
    })
    const saved = await this.transactionRepo.save(entity)

    // Create section transaction rows with movement calculation if sections provided
    const sections = body.sections as Array<Record<string, unknown>> | undefined
    if (Array.isArray(sections) && sections.length > 0) {
      // Only calculate real deltas for Contractual endorsements
      const isContractual = type === 'Contractual'
      for (const s of sections) {
        const sectionId = s.section_id as number
        if (!sectionId) continue

        // Fetch the most recent prior section transaction for movement base
        const prevRows = await this.dataSource.query(
          `SELECT * FROM binding_authority_section_transactions
           WHERE section_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [sectionId],
        )
        const prev = prevRows[0] ?? null

        const mvmt = (cur: unknown, prv: unknown): number =>
          isContractual
            ? Math.round(((Number(cur) || 0) - (Number(prv) || 0)) * 100) / 100
            : 0

        const cur = {
          limit_amount:         s.limit_amount         ?? null,
          excess_amount:        s.excess_amount        ?? null,
          sum_insured:          s.sum_insured          ?? null,
          gross_premium:        s.gross_premium        ?? null,
          net_premium:          s.net_premium          ?? null,
          tax_receivable:       s.tax_receivable       ?? null,
          deductions:           s.deductions           ?? null,
          annual_gross_premium: s.annual_gross_premium ?? null,
          annual_net_premium:   s.annual_net_premium   ?? null,
        }

        await this.dataSource.query(
          `INSERT INTO binding_authority_section_transactions
             (ba_transaction_id, section_id, transaction_type, effective_date, created_by,
              limit_amount, excess_amount, sum_insured, gross_premium, net_premium,
              tax_receivable, deductions, annual_gross_premium, annual_net_premium,
              prev_limit_amount, prev_excess_amount, prev_sum_insured, prev_gross_premium,
              prev_net_premium, prev_tax_receivable, prev_deductions,
              prev_annual_gross_premium, prev_annual_net_premium,
              limit_amount_mvmt, excess_amount_mvmt, sum_insured_mvmt, gross_premium_mvmt,
              net_premium_mvmt, tax_receivable_mvmt, deductions_mvmt,
              annual_gross_premium_mvmt, annual_net_premium_mvmt)
           VALUES
             ($1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10,
              $11,$12,$13,$14,
              $15,$16,$17,$18,
              $19,$20,$21,
              $22,$23,
              $24,$25,$26,$27,
              $28,$29,$30,
              $31,$32)`,
          [
            saved.id, sectionId, type, (body.effective_date ?? body.date ?? null) as string, createdBy,
            cur.limit_amount, cur.excess_amount, cur.sum_insured, cur.gross_premium, cur.net_premium,
            cur.tax_receivable, cur.deductions, cur.annual_gross_premium, cur.annual_net_premium,
            prev?.limit_amount ?? null, prev?.excess_amount ?? null, prev?.sum_insured ?? null,
            prev?.gross_premium ?? null, prev?.net_premium ?? null, prev?.tax_receivable ?? null,
            prev?.deductions ?? null, prev?.annual_gross_premium ?? null, prev?.annual_net_premium ?? null,
            mvmt(cur.limit_amount, prev?.limit_amount),
            mvmt(cur.excess_amount, prev?.excess_amount),
            mvmt(cur.sum_insured, prev?.sum_insured),
            mvmt(cur.gross_premium, prev?.gross_premium),
            mvmt(cur.net_premium, prev?.net_premium),
            mvmt(cur.tax_receivable, prev?.tax_receivable),
            mvmt(cur.deductions, prev?.deductions),
            mvmt(cur.annual_gross_premium, prev?.annual_gross_premium),
            mvmt(cur.annual_net_premium, prev?.annual_net_premium),
          ],
        )
      }
    }

    return this.toTransactionView(saved)
  }

  async getSectionTransaction(orgCode: string, baId: number, txId: number, sectionId: number): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const rows = await this.dataSource.query(
      `SELECT bast.*,
              bas.reference AS section_reference,
              ba.reference  AS ba_reference
       FROM binding_authority_section_transactions bast
       JOIN binding_authority_sections bas ON bas.id = bast.section_id
       JOIN binding_authority_transactions bat ON bat.id = bast.ba_transaction_id
       JOIN binding_authorities ba ON ba.id = bat.binding_authority_id
       WHERE bast.ba_transaction_id = $1
         AND bast.section_id        = $2
         AND ba.id                  = $3`,
      [txId, sectionId, baId],
    )
    if (!rows.length) throw new NotFoundException(`BA section transaction not found.`)
    const d = rows[0]
    return {
      id:               d.id,
      transaction_id:   d.ba_transaction_id,
      section_id:       d.section_id,
      section_reference: d.section_reference,
      ba_reference:     d.ba_reference,
      transaction_type: d.transaction_type,
      effective_date:   d.effective_date,
      current: {
        limit_amount:         d.limit_amount,
        excess_amount:        d.excess_amount,
        sum_insured:          d.sum_insured,
        gross_premium:        d.gross_premium,
        net_premium:          d.net_premium,
        tax_receivable:       d.tax_receivable,
        deductions:           d.deductions,
        annual_gross_premium: d.annual_gross_premium,
        annual_net_premium:   d.annual_net_premium,
      },
      previous: {
        limit_amount:         d.prev_limit_amount,
        excess_amount:        d.prev_excess_amount,
        sum_insured:          d.prev_sum_insured,
        gross_premium:        d.prev_gross_premium,
        net_premium:          d.prev_net_premium,
        tax_receivable:       d.prev_tax_receivable,
        deductions:           d.prev_deductions,
        annual_gross_premium: d.prev_annual_gross_premium,
        annual_net_premium:   d.prev_annual_net_premium,
      },
      movements: {
        limit_amount:         d.limit_amount_mvmt,
        excess_amount:        d.excess_amount_mvmt,
        sum_insured:          d.sum_insured_mvmt,
        gross_premium:        d.gross_premium_mvmt,
        net_premium:          d.net_premium_mvmt,
        tax_receivable:       d.tax_receivable_mvmt,
        deductions:           d.deductions_mvmt,
        annual_gross_premium: d.annual_gross_premium_mvmt,
        annual_net_premium:   d.annual_net_premium_mvmt,
      },
    }
  }

  async updateTransaction(orgCode: string, baId: number, transId: number, body: Record<string, unknown>): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const tx = await this.transactionRepo.findOne({ where: { id: transId, bindingAuthorityId: baId } })
    if (!tx) throw new NotFoundException(`Transaction ${transId} not found`)

    // Active and Issued transactions are terminal states — any PUT is rejected
    if (tx.status === 'Active' || tx.status === 'Issued') {
      throw Object.assign(new Error('An issued transaction cannot be modified'), { statusCode: 409 })
    }

    if (body.status !== undefined) tx.status = body.status as string
    if (body.type !== undefined) tx.type = body.type as string
    if ((body.effective_date ?? body.date) !== undefined) tx.effectiveDate = (body.effective_date ?? body.date) as string
    if (body.description !== undefined) tx.description = body.description as string
    if (body.sub_type !== undefined) {
      tx.payload = {
        ...(tx.payload ?? {}),
        sub_type: body.sub_type ?? (tx.payload as Record<string, unknown>)?.sub_type ?? null,
      }
    }
    if (body.details !== undefined) {
      tx.payload = {
        ...(tx.payload ?? {}),
        details: body.details,
      }
    }

    const saved = await this.transactionRepo.save(tx)

    // When an endorsement is issued (Draft → Issued), apply BA status logic:
    // Cancellation endorsement with effectiveDate ≤ today → BA status becomes Cancelled.
    // Future-dated cancellation leaves BA as Active until that date passes.
    if (body.status === 'Issued') {
      const subType = (saved.payload as Record<string, unknown>)?.sub_type as string | null
      if (subType === 'Cancellation') {
        const today = new Date().toISOString().slice(0, 10)
        const effectiveDate = saved.effectiveDate ?? ''
        if (effectiveDate && effectiveDate <= today) {
          const ba = await this.baRepo.findOne({ where: { id: baId } })
          if (ba) {
            ba.status = 'Cancelled'
            await this.baRepo.save(ba)
          }
        }
      }
    }

    return this.toTransactionView(saved)
  }

  // ---------------------------------------------------------------------------
  // Bordereau Configs
  // ---------------------------------------------------------------------------

  async getBordereauConfigs(orgCode: string, baId: number): Promise<object[]> {
    await this.assertBAOwnership(orgCode, baId)
    const rows = await this.bordereauConfigRepo.find({
      where: { bindingAuthorityId: baId },
      order: { createdAt: 'ASC' },
    })
    return rows.map(c => this.toBordereauConfigView(c))
  }

  async createBordereauConfig(orgCode: string, baId: number, body: Record<string, unknown>): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const entity = this.bordereauConfigRepo.create({
      bindingAuthorityId: baId,
      configId: body.config_id as string,
      name: body.name as string,
      type: (body.type as string) ?? 'Risk',
      dataStyle: (body.data_style as string) ?? 'Transactional',
      fields: (body.fields as string[]) ?? [],
      createdByOrgCode: orgCode,
    })
    const saved = await this.bordereauConfigRepo.save(entity)
    return this.toBordereauConfigView(saved)
  }

  async updateBordereauConfig(orgCode: string, baId: number, configId: string, body: Record<string, unknown>): Promise<object> {
    await this.assertBAOwnership(orgCode, baId)
    const cfg = await this.bordereauConfigRepo.findOne({ where: { configId, bindingAuthorityId: baId } })
    if (!cfg) throw new NotFoundException(`Bordereau config ${configId} not found`)
    if (body.name !== undefined) cfg.name = body.name as string
    if (body.type !== undefined) cfg.type = body.type as string
    if (body.data_style !== undefined) cfg.dataStyle = body.data_style as string
    if (body.fields !== undefined) cfg.fields = body.fields as string[]
    const saved = await this.bordereauConfigRepo.save(cfg)
    return this.toBordereauConfigView(saved)
  }

  async deleteBordereauConfig(orgCode: string, baId: number, configId: string): Promise<void> {
    await this.assertBAOwnership(orgCode, baId)
    await this.bordereauConfigRepo.delete({ configId, bindingAuthorityId: baId })
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
      class_of_business_code: s.classOfBusinessCode,
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

  private toBordereauConfigView(c: BABordereauConfig): object {
    return {
      id: c.id,
      config_id: c.configId,
      binding_authority_id: c.bindingAuthorityId,
      name: c.name,
      type: c.type,
      data_style: c.dataStyle,
      fields: c.fields,
      created_at: c.createdAt,
    }
  }

  private toTransactionView(t: BATransaction): object {
    return {
      id: t.id,
      binding_authority_id: t.bindingAuthorityId,
      type: t.type,
      sub_type: (t.payload as Record<string, unknown>)?.sub_type ?? null,
      status: t.status,
      sequence_number: null,
      effective_date: t.effectiveDate,
      description: t.description,
      created_by: t.createdBy,
      created_at: t.createdAt,
      details: (t.payload as Record<string, unknown>)?.details ?? null,
    }
  }

  // ---------------------------------------------------------------------------
  // Documents (REQ-BA-FE-F-090 to F-098)
  // ---------------------------------------------------------------------------

  async getDocuments(orgCode: string, baId: number): Promise<object[]> {
    await this.assertBAOwnership(orgCode, baId)
    const docs = await this.docRepo.find({
      where: { bindingAuthorityId: baId },
      order: { createdAt: 'DESC' },
      select: ['id', 'reference', 'format', 'filename', 'createdAt'],
      take: 50,
    })
    return docs.map(d => ({
      id: d.id,
      reference: d.reference,
      format: d.format,
      filename: d.filename,
      created_at: d.createdAt,
    }))
  }

  async generateDocument(orgCode: string, baId: number, format: string): Promise<object> {
    const ba = await this.assertBAOwnership(orgCode, baId)
    const sections = await this.sectionRepo.find({ where: { bindingAuthorityId: baId } })

    // Generate a simple text-based PDF snapshot
    // To produce a real PDF, install pdfkit: npm i pdfkit @types/pdfkit
    const timestamp = Date.now()
    const filename = `${ba.reference}-${timestamp}.${format}`
    const lines = [
      'BINDING AUTHORITY CONTRACT',
      '='.repeat(40),
      `Reference: ${ba.reference}`,
      `Status: ${ba.status}`,
      `Inception: ${ba.inceptionDate ?? 'N/A'}`,
      `Expiry: ${ba.expiryDate ?? 'N/A'}`,
      `Year of Account: ${ba.yearOfAccount ?? 'N/A'}`,
      '',
      'SCHEDULE OF SECTIONS',
      '-'.repeat(40),
      ...sections.map(s => `  ${s.reference} | ${s.classOfBusiness ?? ''} | ${s.inceptionDate ?? ''} – ${s.expiryDate ?? ''}`),
      '',
      `Generated: ${new Date().toISOString()}`,
      'Draft document generated by Policy Forge (Not for circulation)',
    ]
    const content = Buffer.from(lines.join('\n'), 'utf-8')

    const doc = this.docRepo.create({
      bindingAuthorityId: baId,
      reference: ba.reference,
      format,
      filename,
      content,
      meta: { sectionsCount: sections.length },
    })
    const saved = await this.docRepo.save(doc)
    return {
      id: saved.id,
      reference: saved.reference,
      format: saved.format,
      filename: saved.filename,
      created_at: saved.createdAt,
    }
  }

  async getDocument(orgCode: string, baId: number, docId: number): Promise<BADocument> {
    await this.assertBAOwnership(orgCode, baId)
    const doc = await this.docRepo.findOne({
      where: { id: docId, bindingAuthorityId: baId },
    })
    if (!doc) throw new NotFoundException(`Document ${docId} not found`)
    return doc
  }
}
