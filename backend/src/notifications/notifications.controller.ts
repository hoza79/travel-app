import { Controller, Get, Patch, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findUnread(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.findUnread(userId);
  }

  @Get('all')
  findAll(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.findAll(userId);
  }

  @Patch('mark-read')
  markAllRead(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.markAllRead(userId);
  }
}
