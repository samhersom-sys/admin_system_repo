import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * OrganisationHierarchy entity — maps to `organisation_hierarchy`.
 * Source: backend/nest/src/migrations/1740000000004-add-org-tables.ts
 */
@Entity('organisation_hierarchy')
@Index('idx_org_hierarchy_order', ['levelOrder'])
export class OrganisationHierarchy {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'level_name', type: 'varchar', length: 200 })
  levelName: string

  @Column({ name: 'level_order', type: 'int' })
  levelOrder: number

  @Column({ name: 'parent_level_id', type: 'int', nullable: true })
  parentLevelId: number | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}

/**
 * OrganisationEntity entity — maps to `organisation_entities`.
 * Source: backend/nest/src/migrations/1740000000004-add-org-tables.ts
 */
@Entity('organisation_entities')
@Index('idx_org_entities_level', ['hierarchyLevelId'])
@Index('idx_org_entities_parent', ['parentEntityId'])
export class OrganisationEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'entity_name', type: 'varchar', length: 200 })
  entityName: string

  @Column({ name: 'entity_code', type: 'varchar', length: 50, nullable: true, unique: true })
  entityCode: string | null

  @Column({ name: 'hierarchy_level_id', type: 'int' })
  hierarchyLevelId: number

  @Column({ name: 'parent_entity_id', type: 'int', nullable: true })
  parentEntityId: number | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}

/**
 * OrganisationHierarchyConfig entity — maps to `organisation_hierarchy_config`.
 * Source: backend/nest/src/migrations/1740000000004-add-org-tables.ts
 */
@Entity('organisation_hierarchy_config')
@Index('idx_org_hierarchy_config_entity', ['organisationEntityId'])
export class OrganisationHierarchyConfig {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'organisation_entity_id', type: 'int' })
  organisationEntityId: number

  @Column({ name: 'hierarchy_level_id', type: 'int' })
  hierarchyLevelId: number

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}

/**
 * OrganisationHierarchyLink entity — maps to `organisation_hierarchy_links`.
 * Source: backend/nest/src/migrations/1740000000004-add-org-tables.ts
 */
@Entity('organisation_hierarchy_links')
@Index('idx_org_hierarchy_links_entity', ['organisationEntityId'])
export class OrganisationHierarchyLink {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'organisation_entity_id', type: 'int' })
  organisationEntityId: number

  @Column({ name: 'parent_config_id', type: 'int' })
  parentConfigId: number

  @Column({ name: 'child_config_id', type: 'int' })
  childConfigId: number

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}

/**
 * ClearanceQueue entity — maps to `clearance_queue`.
 * Source: backend/nest/src/migrations/1740000000003-add-workflow-tables.ts
 */
@Entity('clearance_queue')
@Index('idx_clearance_queue_org', ['orgCode'])
@Index('idx_clearance_queue_status', ['clearanceStatus'])
export class ClearanceQueue {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'org_code', type: 'varchar', length: 50 })
  orgCode: string

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  insured: string | null

  @Column({ name: 'inception_date', type: 'date', nullable: true })
  inceptionDate: string | null

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ name: 'clearance_status', type: 'varchar', length: 50, default: 'pending_clearance' })
  clearanceStatus: string

  @Column({ name: 'cleared_by', type: 'varchar', length: 255, nullable: true })
  clearedBy: string | null

  @Column({ name: 'cleared_date', type: 'timestamptz', nullable: true })
  clearedDate: Date | null

  @Column({ name: 'assigned_to', type: 'varchar', length: 255, nullable: true })
  assignedTo: string | null

  @CreateDateColumn({ name: 'created_date', type: 'timestamptz' })
  createdDate: Date
}
