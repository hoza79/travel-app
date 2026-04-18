import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Module({
  imports: [DatabaseModule],
  controllers: [MessagesController],
  providers: [MessagesService, NotificationsGateway],
})
export class MessagesModule {}
