import { Injectable, Inject } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class MessagesService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async insertMessage(userId: number, body: any) {
    const { conversationId, receiverId, message_text } = body;

    await this.db.query(
      `
      INSERT INTO messages(conversation_id, sender_id, receiver_id, message_text, sent_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [conversationId, userId, receiverId, message_text],
    );

    return { success: true };
  }

  async getMessages(userId: number, conversationId: number) {
    const [rows]: any = await this.db.query(
      `
      SELECT *
      FROM messages
      WHERE conversation_id = ?
      ORDER BY sent_at ASC
      `,
      [conversationId],
    );

    return rows;
  }
}
