import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { NotificationsService } from './notifications.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get('notifications')
  getNotifications(
    @Query('userName') userName?: string,
    @Query('orgCode') orgCode?: string,
  ) {
    return this.notificationsService.getNotifications(userName, orgCode)
  }

  @Post('notifications')
  @HttpCode(201)
  createNotification(@Body() body: Record<string, unknown>) {
    return this.notificationsService.createNotification(body)
  }

  @Post('notifications/bulk-delete')
  @HttpCode(204)
  async bulkDelete(@Body() body: { ids?: Array<number | string> }) {
    const ids = Array.isArray(body?.ids)
      ? body.ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      : []
    await this.notificationsService.bulkDelete(ids)
  }

  @Patch('notifications/:id/read')
  @HttpCode(204)
  async markRead(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.markNotificationRead(id)
  }

  @Delete('notifications/:id')
  @HttpCode(204)
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.deleteNotification(id)
  }
}