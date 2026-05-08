import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm'
import { BindingAuthority } from './binding-authority.entity'

@Entity('binding_authority_documents')
export class BADocument {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'binding_authority_id' })
    bindingAuthorityId: number

    @ManyToOne(() => BindingAuthority, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'binding_authority_id' })
    bindingAuthority: BindingAuthority

    @Column()
    reference: string

    @Column({ length: 10 })
    format: string

    @Column()
    filename: string

    @Column({ type: 'bytea' })
    content: Buffer

    @Column({ type: 'jsonb', nullable: true })
    meta: Record<string, unknown>

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date
}
