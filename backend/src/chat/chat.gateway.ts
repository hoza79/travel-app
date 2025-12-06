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

  // --------------------------------
  // CONNECTIONS
  // --------------------------------
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

  // --------------------------------
  // IDENTIFY USER
  // --------------------------------
  @SubscribeMessage('chat_identify')
  identify(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const userId = Number(data?.userId);
    if (!userId) return;

    this.clients.set(userId, client.id);
    return { status: 'ok' };
  }

  // --------------------------------
  // SEND MESSAGE
  // --------------------------------
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: any,
  ) {
    const { conversationId, sender_id, receiver_id, message_text } = message;

    // SAVE MESSAGE
    await this.db.query(
      `
      INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, sent_at, is_read)
      VALUES (?, ?, ?, ?, NOW(), 0)
      `,
      [conversationId, sender_id, receiver_id, message_text],
    );

    const payload = {
      conversationId,
      sender_id,
      receiver_id,
      message_text,
      sent_at: new Date(),
    };

    // EMIT MESSAGE TO RECEIVER + SENDER
    const receiverSocket = this.clients.get(receiver_id);
    if (receiverSocket) {
      this.server.to(receiverSocket).emit('newMessage', payload);
    }
    client.emit('newMessage', payload);

    // -------------------------------------------
    // FETCH CONVERSATION PREVIEW FOR SENDER
    // -------------------------------------------
    const [senderRows]: any = await this.db.query(
      `
      SELECT 
        c.id AS conversationId,
        u.id AS otherUserId,
        CONCAT(u.first_name, ' ', u.last_name) AS otherUserName,
        u.profile_photo AS otherUserPhoto,
        m.message_text AS lastMessageText,
        m.sent_at AS lastMessageTime,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE conversation_id = c.id 
          AND receiver_id = ?
          AND is_read = 0
        ) AS unreadCount
      FROM conversations c
      JOIN conversation_participants cp_me
        ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id AND cp_other.user_id != cp_me.user_id
      JOIN users u 
        ON u.id = cp_other.user_id
      LEFT JOIN messages m 
        ON m.id = (
          SELECT id FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY sent_at DESC 
          LIMIT 1
        )
      WHERE c.id = ?
      LIMIT 1
      `,
      [sender_id, sender_id, conversationId],
    );

    const senderPreview = senderRows[0];

    // -------------------------------------------
    // FETCH CONVERSATION PREVIEW FOR RECEIVER
    // -------------------------------------------
    const [receiverRows]: any = await this.db.query(
      `
      SELECT 
        c.id AS conversationId,
        u.id AS otherUserId,
        CONCAT(u.first_name, ' ', u.last_name) AS otherUserName,
        u.profile_photo AS otherUserPhoto,
        m.message_text AS lastMessageText,
        m.sent_at AS lastMessageTime,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE conversation_id = c.id 
          AND receiver_id = ?
          AND is_read = 0
        ) AS unreadCount
      FROM conversations c
      JOIN conversation_participants cp_me
        ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id AND cp_other.user_id != cp_me.user_id
      JOIN users u 
        ON u.id = cp_other.user_id
      LEFT JOIN messages m 
        ON m.id = (
          SELECT id FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY sent_at DESC 
          LIMIT 1
        )
      WHERE c.id = ?
      LIMIT 1
      `,
      [receiver_id, receiver_id, conversationId],
    );

    const receiverPreview = receiverRows[0];

    // EMIT UPDATED PREVIEW TO BOTH USERS
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

  // --------------------------------
  // MARK MESSAGES AS READ
  // --------------------------------
  @SubscribeMessage('mark_read')
  async markMessagesRead(@MessageBody() data: any) {
    const { conversationId, userId } = data;

    // 1) Update DB
    await this.db.query(
      `
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ?
      AND receiver_id = ?
      `,
      [conversationId, userId],
    );

    // 2) Recompute preview for THIS user (so unreadCount becomes 0)
    const [rows]: any = await this.db.query(
      `
      SELECT 
        c.id AS conversationId,
        u.id AS otherUserId,
        CONCAT(u.first_name, ' ', u.last_name) AS otherUserName,
        u.profile_photo AS otherUserPhoto,
        m.message_text AS lastMessageText,
        m.sent_at AS lastMessageTime,
        (
          SELECT COUNT(*) FROM messages 
          WHERE conversation_id = c.id
          AND receiver_id = ?
          AND is_read = 0
        ) AS unreadCount
      FROM conversations c
      JOIN conversation_participants cp_me
        ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id AND cp_other.user_id != cp_me.user_id
      JOIN users u
        ON u.id = cp_other.user_id
      LEFT JOIN messages m
        ON m.id = (
          SELECT id FROM messages
          WHERE conversation_id = c.id
          ORDER BY sent_at DESC
          LIMIT 1
        )
      WHERE c.id = ?
      LIMIT 1
      `,
      [userId, userId, conversationId],
    );

    const preview = rows[0];
    const socketId = this.clients.get(userId);

    // 3) Push fresh preview to that user so UI loses highlight
    if (socketId && preview) {
      this.server.to(socketId).emit('conversationUpdate', preview);
    }

    return { ok: true };
  }
}
