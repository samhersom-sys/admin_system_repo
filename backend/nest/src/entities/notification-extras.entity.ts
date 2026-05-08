import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * ChatMessage entity — maps to `chat_messages`.
 * Schema source: db/schema/16-notifications.js
 */
@Entity('chat_messages')
@Index('idx_chat_messages_conversation_id', ['conversationId'])
@Index('idx_chat_messages_sender', ['sender'])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: true })
  sender: string | null

  @Column({ type: 'text', nullable: true })
  recipient: string | null

  @Column({ type: 'text', nullable: true })
  message: string | null

  @Column({ name: 'conversation_id', type: 'text', nullable: true })
  conversationId: string | null

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

/**
 * NotificationMessage entity — maps to `notification_messages`.
 * Schema source: db/schema/16-notifications.js
 *
 * System-level message catalogue (keyed by message_code).
 */
@Entity('notification_messages')
@Index('idx_notification_messages_type', ['messageType'])
export class NotificationMessage {
  @PrimaryColumn({ name: 'message_code', type: 'text' })
  messageCode: string

  @Column({ name: 'message_text', type: 'text' })
  messageText: string

  @Column({ name: 'message_type', type: 'text', default: 'info' })
  messageType: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null
}

/**
 * NotificationTemplate entity — maps to `notification_templates`.
 * Schema source: db/schema/16-notifications.js
 */
@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryColumn({ name: 'template_code', type: 'varchar', length: 50 })
  templateCode: string

  @Column({ name: 'template_name', type: 'varchar', length: 100, nullable: true })
  templateName: string | null

  @Column({ name: 'template_subject', type: 'text', nullable: true })
  templateSubject: string | null

  @Column({ name: 'template_body', type: 'text' })
  templateBody: string

  @Column({ type: 'varchar', length: 50, default: 'in-app' })
  channel: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

/**
 * UserNotification entity — maps to `user_notifications`.
 * Schema source: db/schema/16-notifications.js
 */
@Entity('user_notifications')
@Index('idx_user_notifications_user_name', ['userName'])
@Index('idx_user_notifications_template_code', ['templateCode'])
@Index('idx_user_notifications_created_at', ['createdAt'])
export class UserNotification {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  userName: string | null

  @Column({ name: 'template_code', type: 'varchar', length: 50, nullable: true })
  templateCode: string | null

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  contextData: Record<string, unknown> | null

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean

  @Column({ name: 'is_dismissed', type: 'boolean', default: false })
  isDismissed: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt: Date | null
}
