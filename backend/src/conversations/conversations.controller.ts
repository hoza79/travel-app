import {
  Controller,
  Post,
  Get,
  Req,
  Body,
  Delete,
  Param,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('start')
  async startConversation(@Req() req, @Body() body) {
    const userId = verifyToken(req);
    const otherUserId = Number(body.otherUserId);
    return this.conversationsService.startConversation(userId, otherUserId);
  }

  @Get()
  async getUserConversations(@Req() req) {
    const userId = verifyToken(req);
    return this.conversationsService.getUserConversations(userId);
  }

  @Delete(':conversationId')
  async deleteConversation(
    @Req() req,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = verifyToken(req);
    return this.conversationsService.deleteConversation(
      userId,
      Number(conversationId),
    );
  }
}
