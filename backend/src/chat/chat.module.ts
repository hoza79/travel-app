import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule], // 🔥 REQUIRED
  providers: [ChatGateway],
})
export class ChatModule {}
