import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<number, string>();

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);

    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId);
        break;
      }
    }
  }

  // 🔥 FIX: rename the event so it won't collide with NotificationsGateway
  @SubscribeMessage('chat_identify')
  identify(client: any, @MessageBody() data: any) {
    const userId = Number(data?.userId);

    if (!userId) {
      console.log(
        'ChatGateway received invalid chat_identify payload:',
        JSON.stringify(data),
      );
      return { status: 'error', message: 'Invalid payload' };
    }

    this.clients.set(userId, client.id);
    return { status: 'ok' };
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(client: any, @MessageBody() message: any) {
    const targetSocket = this.clients.get(message.receiver_id);

    if (targetSocket) {
      this.server.to(targetSocket).emit('newMessage', message);
    }

    return { delivered: !!targetSocket };
  }
}
