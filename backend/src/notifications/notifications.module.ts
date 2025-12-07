// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],

  // ⭐ FIX: Export the gateway so other modules (PostModule) can use it
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
