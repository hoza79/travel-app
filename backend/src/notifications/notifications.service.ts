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
        (receiver_id, sender_id, trip_id, type, message, interest_request_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [receiverId, senderId, tripId, type, message, interestRequestId],
    );

    const insertedId = res.insertId;

    const [[notif]]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_name,
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

      // Send via gateway to all sockets for receiver
      try {
        this.gateway.sendNotification(receiverId, notif);
        this.logger.log(
          `Notification emitted to user ${receiverId} (id=${insertedId})`,
        );
      } catch (e) {
        this.logger.error('Failed to emit notification via gateway', e as any);
      }
    } else {
      this.logger.warn(
        `Inserted notification id ${insertedId} not found in DB SELECT`,
      );
    }

    return notif;
  }

  async findAll(receiverId: number) {
    const [rows]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.receiver_id = ?
        ORDER BY notifications.created_at DESC
      `,
      [receiverId],
    );

    (rows || []).forEach((r) => {
      if (r.created_at instanceof Date)
        r.created_at = r.created_at.toISOString();
    });

    return rows;
  }
}
