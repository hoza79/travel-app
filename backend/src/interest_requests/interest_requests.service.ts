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
    private readonly gateway: NotificationsGateway, // ⭐ FIXED INJECTION
  ) {}

  // count accepted
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
        `INSERT INTO interest_requests (trip_id, requester_id, owner_id, status) VALUES (?, ?, ?, 'pending')`,
        [tripId, requesterId, ownerId],
      );

      return { message: 'Skapad', id: result.insertId };
    } catch (error) {
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
    if (!id || isNaN(id)) throw new Error('Invalid interest request id');

    const [[req]]: any = await this.db.query(
      `
      SELECT requester_id, trip_id 
      FROM interest_requests 
      WHERE id = ?
      `,
      [id],
    );

    if (!req) throw new BadRequestException('Request not found');

    const acceptedCount = (await this.getAcceptedCount(req.trip_id)).accepted;

    const [[trip]]: any = await this.db.query(
      `SELECT available_seats FROM trips WHERE id = ?`,
      [req.trip_id],
    );

    if (!trip) throw new BadRequestException('Trip not found');

    if (acceptedCount >= trip.available_seats) {
      throw new BadRequestException('This trip is already full');
    }

    await this.db.query(
      `UPDATE interest_requests SET status = 'accepted' WHERE id = ?`,
      [id],
    );

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
  }

  // ⭐ SILENT REJECTION (status = "rejected")
  async remove(id: number) {
    const [[req]]: any = await this.db.query(
      `SELECT requester_id FROM interest_requests WHERE id = ?`,
      [id],
    );

    if (!req) return { success: true };

    // Set rejected
    await this.db.query(
      `UPDATE interest_requests SET status = 'rejected' WHERE id = ?`,
      [id],
    );

    // Delete notifications silently
    await this.db.query(
      `DELETE FROM notifications WHERE interest_request_id = ?`,
      [id],
    );

    // Silent realtime event → updates button to FULL instantly
    try {
      this.gateway.sendDeletion(req.requester_id, id);
    } catch {}

    return { status: 'rejected' };
  }
}
