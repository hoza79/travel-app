import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';

@Injectable()
export class InterestRequestsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInterestRequestDto, requesterId: number) {
    const { tripId, ownerId } = dto;

    if (ownerId === requesterId) {
      throw new BadRequestException('Cannot request your own trip');
    }

    // CHECK: if an interest request already exists for this trip + requester
    const [existingRows]: any = await this.db.query(
      `SELECT id, status FROM interest_requests WHERE trip_id = ? AND requester_id = ? LIMIT 1`,
      [tripId, requesterId],
    );

    if (existingRows && existingRows.length > 0) {
      // return the existing state instead of inserting a duplicate
      const existing = existingRows[0];
      return { status: existing.status, interestRequestId: existing.id };
    }

    const [result]: any = await this.db.query(
      `
      INSERT INTO interest_requests (trip_id, requester_id, owner_id, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [tripId, requesterId, ownerId],
    );

    const interestRequestId = result.insertId;

    if (ownerId !== requesterId) {
      await this.notificationsService.create({
        receiverId: ownerId,
        senderId: requesterId,
        tripId,
        type: 'interest_request',
        message: 'Someone wants to join your trip',
        interestRequestId,
      });
    }

    return { status: 'pending', interestRequestId };
  }

  async getStatus(tripId: number, requesterId: number) {
    const [rows]: any = await this.db.query(
      `
      SELECT status FROM interest_requests
      WHERE trip_id = ? AND requester_id = ?
      LIMIT 1
      `,
      [tripId, requesterId],
    );

    if (rows.length === 0) return { status: null };
    return { status: rows[0].status };
  }

  async acceptRequest(id: number, ownerId: number) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid interest request id');
    }

    await this.db.query(
      `UPDATE interest_requests SET status = 'accepted' WHERE id = ?`,
      [id],
    );

    const [[req]]: any = await this.db.query(
      `
      SELECT requester_id, trip_id 
      FROM interest_requests 
      WHERE id = ?
      `,
      [id],
    );

    if (req) {
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
          message: 'Your request was accepted!',
          interestRequestId: id,
        });
      }
    }

    return { status: 'accepted' };
  }

  remove(id: number) {
    return `Removed interest request ${id}`;
  }
}
