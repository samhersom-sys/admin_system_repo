import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_name', type: 'text', nullable: true })
  userName: string | null

  @Column({ name: 'org_code', type: 'text', nullable: true })
  orgCode: string | null

  @Column({ type: 'text', default: 'info' })
  type: string

  @Column({ type: 'text', default: '' })
  message: string

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}