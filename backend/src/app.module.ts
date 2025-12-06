import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RegisterModule } from './register/register.module';
import { DatabaseModule } from './database/database.module';
import { PostModule } from './post/post.module';
import { LoginModule } from './login/login.module';
import { CompleteProfileModule } from './complete-profile/complete-profile.module';
import { ChatModule } from './chat/chat.module';
import { InterestRequestsModule } from './interest_requests/interest_requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RegisterModule,
    PostModule,
    LoginModule,
    CompleteProfileModule,
    ChatModule,
    InterestRequestsModule,
    NotificationsModule,
    ProfileModule,
    ConversationsModule,
    MessagesModule,
  ],
})
export class AppModule {}
