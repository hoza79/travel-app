import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async insertMessage(@Req() req, @Body() body: any) {
    const userId = verifyToken(req);
    return this.messagesService.insertMessage(userId, body);
  }

  @Get(':conversationId')
  async getMessages(
    @Req() req,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = verifyToken(req);
    return this.messagesService.getMessages(userId, Number(conversationId));
  }
}
