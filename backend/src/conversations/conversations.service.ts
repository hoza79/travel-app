import { Injectable, Inject } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class ConversationsService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  // START OR FETCH EXISTING CONVERSATION
  async startConversation(userId: number, otherUserId: number) {
    const [existing]: any = await this.db.query(
      `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
      WHERE cp1.user_id = ? AND cp2.user_id = ?
      LIMIT 1
      `,
      [userId, otherUserId],
    );

    if (existing.length > 0) {
      return { conversationId: existing[0].id };
    }

    const [result]: any = await this.db.query(
      `INSERT INTO conversations () VALUES ()`,
    );

    const conversationId = result.insertId;

    await this.db.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES (?, ?), (?, ?)`,
      [conversationId, userId, conversationId, otherUserId],
    );

    return { conversationId };
  }

  // GET USER CONVERSATIONS
  async getUserConversations(userId: number) {
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
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != cp.user_id
      JOIN users u ON u.id = cp2.user_id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY sent_at DESC LIMIT 1
      )
      WHERE cp.user_id = ?
      ORDER BY m.sent_at DESC
      `,
      [userId, userId],
    );

    return rows;
  }
}
