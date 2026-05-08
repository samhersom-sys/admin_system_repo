import { BadRequestException } from '@nestjs/common'
import { DATA_SOURCES } from '../reporting/field-mappings'
import type { FilterCondition, LeafCondition, CompoundCondition } from './measure-definition.entity'

/**
 * filter-condition.compiler.ts
 *
 * Compiles a structured FilterCondition JSONB (from tenant-admin measures) into
 * a safe SQL predicate fragment that can be used in CASE WHEN ... THEN 1 ELSE 0 END.
 *
 * SECURITY CONTRACT:
 *   - Field names are validated against the DATA_SOURCES allow-list for the
 *     given sourceKey. Any unknown field causes a BadRequestException.
 *   - Operators are validated against a fixed whitelist.
 *   - Values for lookup-type fields are validated against the field's lookupValues list.
 *   - Values for date/number fields are validated as safe literals (ISO date or numeric).
 *   - The resulting string never contains user-supplied identifiers — only
 *     developer-whitelisted column expressions and validated literal values.
 *
 * This means the compiled expression is safe to interpolate into SQL (within a
 * CASE WHEN clause), provided the caller also adds the mandatory org_code WHERE
 * clause per §5.10.5 of AI Guidelines.
 */

const ALLOWED_OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=', 'IS NULL', 'IS NOT NULL'])

function isCompound(c: FilterCondition): c is CompoundCondition {
    return 'logic' in c
}

/**
 * Escape a single-quoted SQL string literal value.
 * Only alphanumeric, spaces, hyphens, underscores, dots, colons, parentheses
 * and forward slashes are permitted. Anything else throws.
 */
function safeLiteral(value: string): string {
    if (!/^[\w\s\-.,:/()]+$/.test(value)) {
        throw new BadRequestException(`Measure filter value contains disallowed characters: "${value}"`)
    }
    // Escape single quotes by doubling them (standard SQL escaping)
    return `'${value.replace(/'/g, "''")}'`
}

function compileLeaf(leaf: LeafCondition, sourceKey: string): string {
    const sourceConfig = DATA_SOURCES[sourceKey]
    if (!sourceConfig) {
        throw new BadRequestException(`Unknown measure source: ${sourceKey}`)
    }

    const fieldDef = sourceConfig.fields.find(f => f.key === leaf.field)
    if (!fieldDef) {
        throw new BadRequestException(`Field "${leaf.field}" is not a valid dimension for source "${sourceKey}"`)
    }

    if (!ALLOWED_OPERATORS.has(leaf.operator)) {
        throw new BadRequestException(`Operator "${leaf.operator}" is not allowed`)
    }

    if (leaf.operator === 'IS NULL') return `${fieldDef.col} IS NULL`
    if (leaf.operator === 'IS NOT NULL') return `${fieldDef.col} IS NOT NULL`

    if (leaf.value === undefined || leaf.value === null) {
        throw new BadRequestException(`Operator "${leaf.operator}" requires a value`)
    }

    // Validate value against lookupValues if the field has them
    if (fieldDef.lookupValues && fieldDef.lookupValues.length > 0) {
        if (!fieldDef.lookupValues.includes(leaf.value)) {
            throw new BadRequestException(
                `Value "${leaf.value}" is not valid for field "${leaf.field}". ` +
                `Allowed: ${fieldDef.lookupValues.join(', ')}`
            )
        }
    } else if (fieldDef.type === 'number') {
        if (!/^-?\d+(\.\d+)?$/.test(leaf.value)) {
            throw new BadRequestException(`Value "${leaf.value}" is not a valid number for field "${leaf.field}"`)
        }
        return `${fieldDef.col} ${leaf.operator} ${leaf.value}`
    } else if (fieldDef.type === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(leaf.value)) {
            throw new BadRequestException(`Value "${leaf.value}" is not a valid ISO date (YYYY-MM-DD) for field "${leaf.field}"`)
        }
        return `${fieldDef.col} ${leaf.operator} ${safeLiteral(leaf.value)}`
    }

    return `${fieldDef.col} ${leaf.operator} ${safeLiteral(leaf.value)}`
}

function compileCondition(condition: FilterCondition, sourceKey: string): string {
    if (isCompound(condition)) {
        if (!condition.conditions || condition.conditions.length === 0) {
            throw new BadRequestException('Compound filter condition must have at least one sub-condition')
        }
        if (condition.logic !== 'AND' && condition.logic !== 'OR') {
            throw new BadRequestException(`Unknown logic operator: "${condition.logic}"`)
        }
        const parts = condition.conditions.map(c => compileCondition(c, sourceKey))
        return parts.length === 1 ? parts[0] : `(${parts.join(` ${condition.logic} `)})`
    }
    return compileLeaf(condition, sourceKey)
}

/**
 * Compile a FilterCondition JSONB structure into a SQL predicate string.
 *
 * @param condition - The structured condition from the measure_definitions row
 * @param sourceKey - The DATA_SOURCES key for field validation (e.g. 'policies')
 * @returns SQL predicate string, safe for use in CASE WHEN {result} THEN 1 ELSE 0 END
 * @throws BadRequestException if any field, operator, or value fails validation
 */
export function compileFilterCondition(condition: FilterCondition, sourceKey: string): string {
    return compileCondition(condition, sourceKey)
}
