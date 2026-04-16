import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationParams {
  receiverId: number;
  senderId: number;
  tripId: number;
  type: string;
  message: string;
  interestRequestId: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(params: CreateNotificationParams) {
    const { receiverId, senderId, tripId, type, message, interestRequestId } =
      params;

    const [res]: any = await this.db.query(
      `
        INSERT INTO notifications 
        (receiver_id, sender_id, trip_id, type, message, interest_request_id, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [receiverId, senderId, tripId, type, message, interestRequestId],
    );

    const insertedId = res.insertId;

    const [[notif]]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_first_name,
          users.last_name AS sender_last_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.id = ?
      `,
      [insertedId],
    );

    if (notif) {
      if (notif.created_at instanceof Date) {
        notif.created_at = notif.created_at.toISOString();
      }

      try {
        this.gateway.sendNotification(receiverId, notif);
      } catch (e) {
        this.logger.error('Emit failed', e as any);
      }
    }

    return notif;
  }

  async findUnread(receiverId: number) {
    const [rows]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_first_name,
          users.last_name AS sender_last_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.receiver_id = ?
        AND notifications.is_read = 0
        ORDER BY notifications.created_at DESC
      `,
      [receiverId],
    );

    return rows.map((r) => ({
      ...r,
      created_at:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : r.created_at,
    }));
  }

  async findAll(receiverId: number) {
    const [rows]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_first_name,
          users.last_name AS sender_last_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.receiver_id = ?
        ORDER BY notifications.created_at DESC
      `,
      [receiverId],
    );

    return rows.map((r) => ({
      ...r,
      created_at:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : r.created_at,
    }));
  }

  async markAllRead(receiverId: number) {
    await this.db.query(
      `
        UPDATE notifications
        SET is_read = 1
        WHERE receiver_id = ?
      `,
      [receiverId],
    );

    return { success: true };
  }
}
