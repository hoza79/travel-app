import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly gateway: NotificationsGateway,
  ) {}

  async insertMessage(userId: number, body: any) {
    const conversationId = Number(body.conversationId);
    const receiverId = Number(body.receiverId ?? body.receiver_id);
    const { message_text } = body;

    if (!Number.isFinite(conversationId) || !Number.isFinite(receiverId)) {
      throw new BadRequestException('Invalid conversation or receiver');
    }

    await this.assertBothUsersInConversation(
      conversationId,
      userId,
      receiverId,
    );

    await this.db.query(
      `
      INSERT INTO messages(conversation_id, sender_id, receiver_id, message_text, sent_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [conversationId, userId, receiverId, message_text],
    );

    this.gateway.server.to(`user_${receiverId}`).emit('newMessage', {
      conversationId,
      sender_id: userId,
      receiver_id: receiverId,
      message_text,
    });

    return { success: true };
  }

  async getMessages(userId: number, conversationId: number) {
    if (!Number.isFinite(conversationId)) {
      throw new BadRequestException('Invalid conversation id');
    }

    await this.assertUserInConversation(conversationId, userId);

    const [[del]]: any = await this.db.query(
      `
      SELECT deleted_at
      FROM conversation_deleted
      WHERE user_id = ?
      AND conversation_id = ?
      ORDER BY deleted_at DESC
      LIMIT 1
      `,
      [userId, conversationId],
    );

    const deletedAt = del?.deleted_at || null;

    const [rows]: any = await this.db.query(
      `
      SELECT *
      FROM messages
      WHERE conversation_id = ?
      AND (
        ? IS NULL
        OR sent_at > ?
      )
      ORDER BY sent_at ASC
      `,
      [conversationId, deletedAt, deletedAt],
    );

    return rows;
  }

  private async assertUserInConversation(
    conversationId: number,
    userId: number,
  ) {
    const [[row]]: any = await this.db.query(
      `
      SELECT COUNT(*) AS participantCount
      FROM conversation_participants
      WHERE conversation_id = ?
      AND user_id = ?
      `,
      [conversationId, userId],
    );

    if ((row?.participantCount ?? 0) !== 1) {
      throw new ForbiddenException(
        'You are not allowed to access this conversation',
      );
    }
  }

  private async assertBothUsersInConversation(
    conversationId: number,
    userId: number,
    receiverId: number,
  ) {
    const [[row]]: any = await this.db.query(
      `
      SELECT COUNT(DISTINCT user_id) AS participantCount
      FROM conversation_participants
      WHERE conversation_id = ?
      AND user_id IN (?, ?)
      `,
      [conversationId, userId, receiverId],
    );

    if ((row?.participantCount ?? 0) !== 2) {
      throw new ForbiddenException(
        'You are not allowed to send messages in this conversation',
      );
    }
  }
}
