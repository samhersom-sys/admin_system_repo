import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Party } from '../entities/party.entity'

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
    ) {}

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
}

