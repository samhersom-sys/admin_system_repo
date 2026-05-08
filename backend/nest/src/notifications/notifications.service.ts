import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) { }

  async getNotifications(userName?: string, orgCode?: string): Promise<object[]> {
    const qb = this.notificationRepo.createQueryBuilder('notification')

    if (orgCode) {
      qb.andWhere('(notification.orgCode = :orgCode OR notification.orgCode IS NULL)', { orgCode })
    }

    if (userName) {
      qb.andWhere('(notification.userName = :userName OR notification.userName IS NULL)', { userName })
    }

    const rows = await qb.orderBy('notification.createdAt', 'DESC').getMany()
    return rows.map((row) => this.toView(row))
  }

  async createNotification(body: Record<string, unknown>): Promise<object> {
    const entity = this.notificationRepo.create({
      userName: this.asNullableString(body.userName),
      orgCode: this.asNullableString(body.orgCode),
      type: this.asString(body.type, 'info'),
      message: this.asString(body.message, ''),
      isRead: false,
      payload: this.asPayload(body.payload),
    })
    const saved = await this.notificationRepo.save(entity)
    return this.toView(saved)
  }

  async markNotificationRead(id: number): Promise<void> {
    await this.notificationRepo.update({ id }, { isRead: true })
  }

  async deleteNotification(id: number): Promise<void> {
    await this.notificationRepo.delete({ id })
  }

  async bulkDelete(ids: number[]): Promise<void> {
    if (ids.length === 0) return
    await this.notificationRepo.delete({ id: In(ids) })
  }

  private toView(row: Notification): object {
    return {
      id: row.id,
      message: row.message,
      type: row.type,
      read: row.isRead,
      payload: row.payload ?? undefined,
      createdAt: row.createdAt,
    }
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }

  private asPayload(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }
}