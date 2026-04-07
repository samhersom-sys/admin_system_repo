import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Party } from '../entities/party.entity'
import { AuditService } from '../audit/audit.service'

/**
 * Maps a Party entity to the API response shape.
 * The frontend expects `type` (not `role`) for backward compatibility.
 */
function toDto(p: Party): Record<string, unknown> {
    return {
        id: p.id,
        name: p.name,
        type: p.role,
        orgCode: p.orgCode,
        reference: p.reference,
        email: p.email,
        phone: p.phone,
        addressLine1: p.addressLine1,
        addressLine2: p.addressLine2,
        addressLine3: p.addressLine3,
        city: p.city,
        state: p.state,
        postcode: p.postcode,
        country: p.country,
        region: p.region,
        wageRoll: p.wageRoll,
        numberEmployees: p.numberEmployees,
        annualRevenue: p.annualRevenue,
        sicStandard: p.sicStandard,
        sicCode: p.sicCode,
        sicDescription: p.sicDescription,
        createdBy: p.createdBy,
        createdDate: p.createdDate,
    }
}

@Injectable()
export class PartiesService {
    constructor(
        @InjectRepository(Party)
        private readonly partyRepo: Repository<Party>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }

    // ---------------------------------------------------------------------------
    // R01 — GET /api/parties
    // ---------------------------------------------------------------------------
    async findAll(orgCode: string, type?: string, search?: string): Promise<Record<string, unknown>[]> {
        const qb = this.partyRepo
            .createQueryBuilder('p')
            .where('p.orgCode = :orgCode', { orgCode })
            .orderBy('p.name', 'ASC')

        if (type) {
            qb.andWhere('p.role = :role', { role: type })
        }
        if (search) {
            qb.andWhere('p.name ILIKE :search', { search: `%${search}%` })
        }

        const parties = await qb.getMany()
        return parties.map(toDto)
    }

    // ---------------------------------------------------------------------------
    // R02 — POST /api/parties
    // ---------------------------------------------------------------------------
    async create(orgCode: string, body: any): Promise<Record<string, unknown>> {
        const {
            name,
            type,
            reference,
            email,
            phone,
            addressLine1,
            addressLine2,
            addressLine3,
            city,
            state,
            postcode,
            country,
            region,
            createdBy,
        } = body

        if (!name) throw new BadRequestException('name is required')
        if (!type) throw new BadRequestException('type is required')

        const party = this.partyRepo.create({
            name,
            role: type,     // frontend sends 'type'; entity stores as 'role'
            orgCode,        // always from JWT — never trust client value
            reference: reference ?? null,
            email: email ?? null,
            phone: phone ?? null,
            addressLine1: addressLine1 ?? null,
            addressLine2: addressLine2 ?? null,
            addressLine3: addressLine3 ?? null,
            city: city ?? null,
            state: state ?? null,
            postcode: postcode ?? null,
            country: country ?? null,
            region: region ?? null,
            createdBy: createdBy ?? null,
        })

        const saved = await this.partyRepo.save(party)
        return toDto(saved)
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-010 — GET /api/parties/:id
    // ---------------------------------------------------------------------------
    async findOne(orgCode: string, id: number): Promise<Record<string, unknown>> {
        const party = await this.partyRepo.findOne({ where: { id, orgCode } })
        if (!party) throw new NotFoundException(`Party ${id} not found`)
        return toDto(party)
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-011 — PUT /api/parties/:id
    // ---------------------------------------------------------------------------
    async update(orgCode: string, id: number, body: Record<string, unknown>): Promise<Record<string, unknown>> {
        const party = await this.partyRepo.findOne({ where: { id, orgCode } })
        if (!party) throw new NotFoundException(`Party ${id} not found`)

        // Allowed fields — orgCode is always from JWT, never from body
        const allowed: (keyof Party)[] = [
            'name', 'reference', 'email', 'phone',
            'addressLine1', 'addressLine2', 'addressLine3',
            'city', 'state', 'postcode', 'country', 'region',
            'wageRoll', 'numberEmployees', 'annualRevenue',
            'sicStandard', 'sicCode', 'sicDescription',
        ]
        for (const key of allowed) {
            if (key in body) {
                (party as any)[key] = body[key]
            }
        }
        // Map frontend 'type' → entity 'role'
        if ('type' in body) {
            party.role = body['type'] as string
        }

        const saved = await this.partyRepo.save(party)
        return toDto(saved)
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-012a — GET /api/parties/:id/entities
    // ---------------------------------------------------------------------------
    async findEntities(partyId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id, party_id, name, reference, entity_code, entity_type, notes, active, created_at, updated_at
             FROM party_entities
             WHERE party_id = $1 AND active = true
             ORDER BY name ASC`,
            [partyId],
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-012b — POST /api/parties/:id/entities
    // ---------------------------------------------------------------------------
    async createEntity(partyId: number, body: Record<string, unknown>): Promise<any> {
        const name = body['name']
        if (!name || (typeof name === 'string' && name.trim() === '')) {
            throw new BadRequestException('name is required')
        }
        const entityType = body['entity_type'] ?? 'Syndicate'
        const reference = body['reference'] ?? null
        const entityCode = body['entity_code'] ?? null
        const notes = body['notes'] ?? null

        const rows = await this.dataSource.query(
            `INSERT INTO party_entities (party_id, name, reference, entity_code, entity_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, party_id, name, reference, entity_code, entity_type, notes, active, created_at, updated_at`,
            [partyId, name, reference, entityCode, entityType, notes],
        )
        return rows[0]
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-012c — PUT /api/parties/:id/entities/:entityId
    // ---------------------------------------------------------------------------
    async updateEntity(partyId: number, entityId: number, body: Record<string, unknown>): Promise<any> {
        const existing = await this.dataSource.query(
            `SELECT id FROM party_entities WHERE id = $1 AND party_id = $2 AND active = true`,
            [entityId, partyId],
        )
        if (!existing.length) throw new NotFoundException(`Entity ${entityId} not found`)

        const rows = await this.dataSource.query(
            `UPDATE party_entities
             SET name = COALESCE($1, name),
                 reference = COALESCE($2, reference),
                 entity_code = COALESCE($3, entity_code),
                 entity_type = COALESCE($4, entity_type),
                 notes = COALESCE($5, notes),
                 updated_at = NOW()
             WHERE id = $6 AND party_id = $7
             RETURNING id, party_id, name, reference, entity_code, entity_type, notes, active, created_at, updated_at`,
            [
                body['name'] ?? null,
                body['reference'] ?? null,
                body['entity_code'] ?? null,
                body['entity_type'] ?? null,
                body['notes'] ?? null,
                entityId,
                partyId,
            ],
        )
        return rows[0]
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-012d — DELETE /api/parties/:id/entities/:entityId (soft delete)
    // ---------------------------------------------------------------------------
    async deleteEntity(partyId: number, entityId: number): Promise<void> {
        const existing = await this.dataSource.query(
            `SELECT id FROM party_entities WHERE id = $1 AND party_id = $2 AND active = true`,
            [entityId, partyId],
        )
        if (!existing.length) throw new NotFoundException(`Entity ${entityId} not found`)

        await this.dataSource.query(
            `UPDATE party_entities SET active = false, updated_at = NOW() WHERE id = $1`,
            [entityId],
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-013a — GET /api/parties/:id/audit
    // ---------------------------------------------------------------------------
    async getAudit(partyId: number): Promise<any[]> {
        return this.auditService.getHistory('Party', String(partyId))
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-013b — POST /api/parties/:id/audit
    // ---------------------------------------------------------------------------
    async writeAudit(partyId: number, body: Record<string, unknown>, user: any): Promise<any> {
        return this.auditService.writeEvent(
            { ...body, entityType: 'Party', entityId: partyId },
            user,
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-014 — GET /api/parties/:id/submissions
    // ---------------------------------------------------------------------------
    async findRelatedSubmissions(partyId: number, orgCode: string): Promise<any[]> {
        const party = await this.partyRepo.findOne({ where: { id: partyId, orgCode } })
        if (!party) throw new NotFoundException(`Party ${partyId} not found`)

        return this.dataSource.query(
            `SELECT id, reference, insured, status, "inceptionDate" AS inception_date
             FROM submission
             WHERE "createdByOrgCode" = $1
               AND (insured = $2 OR "placingBrokerName" = $2)
             ORDER BY "inceptionDate" DESC`,
            [orgCode, party.name],
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-PAR-BE-F-015 — GET /api/parties/:id/quotes
    // ---------------------------------------------------------------------------
    async findRelatedQuotes(partyId: number, orgCode: string): Promise<any[]> {
        const party = await this.partyRepo.findOne({ where: { id: partyId, orgCode } })
        if (!party) throw new NotFoundException(`Party ${partyId} not found`)

        return this.dataSource.query(
            `SELECT id, reference, insured, status, inception_date
             FROM quote
             WHERE created_by_org_code = $1
               AND insured = $2
             ORDER BY inception_date DESC`,
            [orgCode, party.name],
        )
    }
}

