import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule], // ✅ REQUIRED so DATABASE_CONNECTION is available
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
