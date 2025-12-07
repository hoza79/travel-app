import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PostController],
  providers: [PostService, NotificationsGateway],
})
export class PostModule {}
