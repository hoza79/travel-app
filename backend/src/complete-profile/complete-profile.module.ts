import { Module } from '@nestjs/common';
import { CompleteProfileController } from './complete-profile.controller';
import { CompleteProfileService } from './complete-profile.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CompleteProfileController],
  providers: [CompleteProfileService],
})
export class CompleteProfileModule {}
