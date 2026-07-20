import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm'

/**
 * UserHomepagePreference entity — maps to the `user_homepage_preferences` table.
 * Schema source: migrations/1747500000000-CreateUserHomepagePreferencesTable.ts
 *
 * Stores per-user homepage display preferences for report templates.
 * Multi-tenancy: scoped via org_code per OQ-CHOME-011 (SA correction — uses
 * org_code VARCHAR(100) instead of tenant_id INT FK).
 *
 * Plain FK integer columns only — no @ManyToOne/@OneToMany relations,
 * consistent with existing entity conventions in this codebase.
 */
@Entity('user_homepage_preferences')
@Index('uq_user_homepage_preferences_user_template', ['userId', 'templateId'], { unique: true })
@Index('idx_user_homepage_preferences_org_code', ['orgCode'])
export class UserHomepagePreference {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'user_id', type: 'int' })
    userId: number

    @Column({ name: 'template_id', type: 'int' })
    templateId: number

    @Column({ name: 'show_on_homepage', type: 'boolean', default: false })
    showOnHomepage: boolean

    @Column({ name: 'homepage_page_order', type: 'int', nullable: true })
    homepagePageOrder: number | null

    @Column({ name: 'org_code', type: 'varchar', length: 100 })
    orgCode: string
}
