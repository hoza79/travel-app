import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';

@WebSocketGateway({
  cors: { origin: '*' },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  private clients = new Map<number, string>();

  handleConnection(client: Socket) {
    console.log('Chat client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Chat client disconnected:', client.id);

    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('chat_identify')
  identify(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const userId = Number(data?.userId);
    if (!userId) return;

    this.clients.set(userId, client.id);
    return { status: 'ok' };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: any,
  ) {
    const { conversationId, sender_id, receiver_id, message_text } = message;

    await this.db.query(
      `
      INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, sent_at, is_read)
      VALUES (?, ?, ?, ?, NOW(), 0)
      `,
      [conversationId, sender_id, receiver_id, message_text],
    );

    await this.db.query(
      `
      DELETE FROM conversation_deleted
      WHERE conversation_id = ?
      AND user_id IN (?, ?)
      `,
      [conversationId, sender_id, receiver_id],
    );

    const payload = {
      conversationId,
      sender_id,
      receiver_id,
      message_text,
      sent_at: new Date(),
    };

    const receiverSocket = this.clients.get(receiver_id);
    if (receiverSocket) {
      this.server.to(receiverSocket).emit('newMessage', payload);
    }
    client.emit('newMessage', payload);

    const [[delSender]]: any = await this.db.query(
      `
      SELECT deleted_at 
      FROM conversation_deleted
      WHERE user_id = ? AND conversation_id = ?
      ORDER BY deleted_at DESC
      LIMIT 1
      `,
      [sender_id, conversationId],
    );

    const [[delReceiver]]: any = await this.db.query(
      `
      SELECT deleted_at 
      FROM conversation_deleted
      WHERE user_id = ? AND conversation_id = ?
      ORDER BY deleted_at DESC
      LIMIT 1
      `,
      [receiver_id, conversationId],
    );

    const senderDeletedAt = delSender?.deleted_at || null;
    const receiverDeletedAt = delReceiver?.deleted_at || null;
    const previewSQL = `
      SELECT 
        c.id AS conversationId,
        u.id AS otherUserId,
        CONCAT(u.first_name, ' ', u.last_name) AS otherUserName,
        u.profile_photo AS otherUserPhoto,
        (
          SELECT message_text 
          FROM messages 
          WHERE conversation_id = c.id
          AND (? IS NULL OR sent_at > ?)
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS lastMessageText,
        (
          SELECT sent_at 
          FROM messages 
          WHERE conversation_id = c.id
          AND (? IS NULL OR sent_at > ?)
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS lastMessageTime,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE conversation_id = c.id 
          AND receiver_id = ?
          AND is_read = 0
          AND (? IS NULL OR sent_at > ?)
        ) AS unreadCount
      FROM conversations c
      JOIN conversation_participants cp_me
        ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id AND cp_other.user_id != cp_me.user_id
      JOIN users u 
        ON u.id = cp_other.user_id
      WHERE c.id = ?
      LIMIT 1
    `;

    // SENDER PREVIEW
    const [senderRows]: any = await this.db.query(previewSQL, [
      senderDeletedAt,
      senderDeletedAt,
      senderDeletedAt,
      senderDeletedAt,
      sender_id,
      senderDeletedAt,
      senderDeletedAt,
      sender_id,
      conversationId,
    ]);

    const senderPreview = senderRows[0];

    const [receiverRows]: any = await this.db.query(previewSQL, [
      receiverDeletedAt,
      receiverDeletedAt,
      receiverDeletedAt,
      receiverDeletedAt,
      receiver_id,
      receiverDeletedAt,
      receiverDeletedAt,
      receiver_id,
      conversationId,
    ]);

    const receiverPreview = receiverRows[0];

    const senderSocket = this.clients.get(sender_id);
    if (senderSocket && senderPreview) {
      this.server.to(senderSocket).emit('conversationUpdate', senderPreview);
    }

    if (receiverSocket && receiverPreview) {
      this.server
        .to(receiverSocket)
        .emit('conversationUpdate', receiverPreview);
    }

    return { delivered: !!receiverSocket };
  }

  @SubscribeMessage('mark_read')
  async markMessagesRead(@MessageBody() data: any) {
    const { conversationId, userId } = data;

    await this.db.query(
      `
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ?
      AND receiver_id = ?
      `,
      [conversationId, userId],
    );

    const [[del]]: any = await this.db.query(
      `
      SELECT deleted_at 
      FROM conversation_deleted
      WHERE user_id = ? AND conversation_id = ?
      ORDER BY deleted_at DESC
      LIMIT 1
      `,
      [userId, conversationId],
    );

    const deletedAt = del?.deleted_at || null;

    const [rows]: any = await this.db.query(
      `
      SELECT 
        c.id AS conversationId,
        u.id AS otherUserId,
        CONCAT(u.first_name, ' ', u.last_name) AS otherUserName,
        u.profile_photo AS otherUserPhoto,
        (
          SELECT message_text 
          FROM messages 
          WHERE conversation_id = c.id
          AND (? IS NULL OR sent_at > ?)
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS lastMessageText,
        (
          SELECT sent_at 
          FROM messages 
          WHERE conversation_id = c.id
          AND (? IS NULL OR sent_at > ?)
          ORDER BY sent_at DESC 
          LIMIT 1
        ) AS lastMessageTime,
        0 AS unreadCount
      FROM conversations c
      JOIN conversation_participants cp_me
        ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id AND cp_other.user_id != cp_me.user_id
      JOIN users u
        ON u.id = cp_other.user_id
      WHERE c.id = ?
      LIMIT 1
      `,
      [deletedAt, deletedAt, deletedAt, deletedAt, userId, conversationId],
    );

    const preview = rows[0];
    const socketId = this.clients.get(userId);

    if (socketId && preview) {
      this.server.to(socketId).emit('conversationUpdate', preview);
    }

    return { ok: true };
  }
}
