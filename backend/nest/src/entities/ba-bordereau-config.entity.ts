import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm'
import { BindingAuthority } from './binding-authority.entity'

@Entity('binding_authority_bordereau_configs')
export class BABordereauConfig {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'binding_authority_id' })
    bindingAuthorityId: number

    @ManyToOne(() => BindingAuthority, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'binding_authority_id' })
    bindingAuthority: BindingAuthority

    @Column({ name: 'config_id', unique: true })
    configId: string

    @Column()
    name: string

    @Column({ default: 'Risk' })
    type: string

    @Column({ name: 'data_style', default: 'Transactional' })
    dataStyle: string

    @Column({ type: 'jsonb', default: [] })
    fields: string[]

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @Column({ name: 'created_by_org_code', nullable: true })
    createdByOrgCode: string
}
