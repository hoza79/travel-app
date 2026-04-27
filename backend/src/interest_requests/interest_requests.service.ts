import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';

@Injectable()
export class InterestRequestsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async getAcceptedCount(tripId: number) {
    const [rows]: any = await this.db.query(
      `
      SELECT COUNT(*) AS accepted
      FROM interest_requests
      WHERE trip_id = ? AND status = 'accepted'
      `,
      [tripId],
    );

    return { accepted: rows[0].accepted ?? 0 };
  }

  async create(dto: CreateInterestRequestDto, requesterId: number) {
    const { tripId, ownerId } = dto;

    try {
      const [result]: any = await this.db.query(
        `INSERT INTO interest_requests (trip_id, requester_id, owner_id, status) 
         VALUES (?, ?, ?, 'pending')`,
        [tripId, requesterId, ownerId],
      );

      const interestRequestId = result.insertId;

      await this.notificationsService.create({
        receiverId: ownerId,
        senderId: requesterId,
        tripId,
        type: 'interest_request',
        message: 'Wants to join your trip',
        interestRequestId,
      });

      return { message: 'Skapad', id: interestRequestId };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('Redan anmäld');
      }
      throw error;
    }
  }

  async getStatus(tripId: number, requesterId: number) {
    const [rows]: any = await this.db.query(
      `SELECT status FROM interest_requests WHERE trip_id = ? AND requester_id = ? LIMIT 1`,
      [tripId, requesterId],
    );

    return rows.length === 0 ? { status: null } : { status: rows[0].status };
  }

  async acceptRequest(id: number, ownerId: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid interest request id');
    }

    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [[req]]: any = await connection.query(
        `
        SELECT requester_id, trip_id, status
        FROM interest_requests
        WHERE id = ?
        FOR UPDATE
        `,
        [id],
      );

      if (!req) {
        await connection.rollback();
        throw new BadRequestException('Request not found');
      }

      if (req.status !== 'pending') {
        await connection.rollback();
        throw new BadRequestException('Request already handled');
      }

      const [[trip]]: any = await connection.query(
        `
        SELECT available_seats
        FROM trips
        WHERE id = ?
        FOR UPDATE
        `,
        [req.trip_id],
      );

      if (!trip) {
        await connection.rollback();
        throw new BadRequestException('Trip not found');
      }

      const [result]: any = await connection.query(
        `
          UPDATE interest_requests ir
          JOIN trips t ON ir.trip_id = t.id
          SET ir.status = 'accepted'
          WHERE ir.id = ?
          AND ir.status = 'pending'
          AND (
            SELECT COUNT(*) 
            FROM interest_requests 
            WHERE trip_id = t.id AND status = 'accepted'
          ) < t.available_seats
        `,
        [id],
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        throw new BadRequestException('Trip is full or already handled');
      }

      await connection.query(
        `
        UPDATE interest_requests
        SET status = 'accepted'
        WHERE id = ?
        `,
        [id],
      );

      await connection.commit();

      await this.db.query(
        `DELETE FROM notifications WHERE interest_request_id = ?`,
        [id],
      );

      if (req.requester_id !== ownerId) {
        await this.notificationsService.create({
          receiverId: req.requester_id,
          senderId: ownerId,
          tripId: req.trip_id,
          type: 'interest_accepted',
          message: 'Accepted your request!',
          interestRequestId: id,
        });
      }

      return { status: 'accepted' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async remove(id: number) {
    const [[req]]: any = await this.db.query(
      `SELECT requester_id FROM interest_requests WHERE id = ?`,
      [id],
    );

    if (!req) return { success: true };

    await this.db.query(
      `UPDATE interest_requests SET status = 'rejected' WHERE id = ?`,
      [id],
    );

    await this.db.query(
      `DELETE FROM notifications WHERE interest_request_id = ?`,
      [id],
    );

    try {
      this.gateway.sendDeletion(req.requester_id, id);
    } catch {}

    return { status: 'rejected' };
  }
}
