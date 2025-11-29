import { Module } from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { InterestRequestsController } from './interest_requests.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [InterestRequestsController],
  providers: [InterestRequestsService],
})
export class InterestRequestsModule {}
