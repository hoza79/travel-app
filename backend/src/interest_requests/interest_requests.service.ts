import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
    const { tripId } = dto;

    const [[trip]]: any = await this.db.query(
      `
    SELECT creator_id, available_seats, type
    FROM trips
    WHERE id = ?
    LIMIT 1
    `,
      [tripId],
    );

    if (!trip) {
      throw new BadRequestException('Trip not found');
    }

    const ownerId = trip.creator_id;
    const isSearchingTrip = trip.type === 'Searching';
    const capacityMessage = isSearchingTrip
      ? 'Request is already matched'
      : 'Trip is full';

    const interestMessage = isSearchingTrip
      ? 'Can offer a ride for your request'
      : 'Wants to join your trip';
    if (ownerId === requesterId) {
      throw new BadRequestException(
        'You cannot request interest on your own trip',
      );
    }

    const [[countRow]]: any = await this.db.query(
      `
    SELECT COUNT(*) AS accepted
    FROM interest_requests
    WHERE trip_id = ? AND status = 'accepted'
    `,
      [tripId],
    );

    const acceptedCount = countRow.accepted ?? 0;

    if (acceptedCount >= trip.available_seats) {
      throw new BadRequestException(capacityMessage);
    }

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
        message: interestMessage,
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
  async acceptRequest(id: number, loggedInUserId: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid interest request id');
    }

    const connection = await this.db.getConnection();
    let acceptedRequest: {
      requesterId: number;
      tripId: number;
      tripType: string;
    } | null = null;
    try {
      await connection.beginTransaction();

      const [[req]]: any = await connection.query(
        `
      SELECT
        requester_id,
        trip_id,
        owner_id,
        status
      FROM interest_requests
      WHERE id = ?
      FOR UPDATE
      `,
        [id],
      );

      if (!req) {
        throw new BadRequestException('Request not found');
      }

      const [[trip]]: any = await connection.query(
        `
      SELECT creator_id, available_seats, type
      FROM trips
      WHERE id = ?
      FOR UPDATE
      `,
        [req.trip_id],
      );

      if (!trip) {
        throw new BadRequestException('Trip not found');
      }

      if (
        req.owner_id !== loggedInUserId ||
        trip.creator_id !== loggedInUserId
      ) {
        throw new ForbiddenException('You cannot accept this request');
      }

      if (req.status !== 'pending') {
        throw new BadRequestException('Request already handled');
      }

      const [[countRow]]: any = await connection.query(
        `
      SELECT COUNT(*) AS accepted
      FROM interest_requests
      WHERE trip_id = ? AND status = 'accepted'
      `,
        [req.trip_id],
      );

      const acceptedCount = countRow.accepted ?? 0;

      if (acceptedCount >= trip.available_seats) {
        throw new BadRequestException(
          trip.type === 'Searching'
            ? 'Request is already matched'
            : 'Trip is full',
        );
      }

      await connection.query(
        `
      UPDATE interest_requests
      SET status = 'accepted'
      WHERE id = ? AND status = 'pending'
      `,
        [id],
      );

      await connection.query(
        `
      INSERT INTO trip_participants (trip_id, user_id, role)
      VALUES (?, ?, 'passenger')
      ON DUPLICATE KEY UPDATE role = VALUES(role)
      `,
        [req.trip_id, req.requester_id],
      );

      await connection.commit();

      acceptedRequest = {
        requesterId: req.requester_id,
        tripId: req.trip_id,
        tripType: trip.type,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await this.db.query(
      `DELETE FROM notifications WHERE interest_request_id = ?`,
      [id],
    );

    if (acceptedRequest.requesterId !== loggedInUserId) {
      await this.notificationsService.create({
        receiverId: acceptedRequest.requesterId,
        senderId: loggedInUserId,
        tripId: acceptedRequest.tripId,
        type: 'interest_accepted',
        message:
          acceptedRequest.tripType === 'Searching'
            ? 'Accepted your offer!'
            : 'Accepted your request!',
        interestRequestId: id,
      });
    }

    return { status: 'accepted' };
  }

  async remove(id: number, loggedInUserId: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid interest request id');
    }

    const [[req]]: any = await this.db.query(
      `
    SELECT
      ir.requester_id,
      ir.trip_id,
      ir.owner_id,
      ir.status,
      t.creator_id
    FROM interest_requests ir
    JOIN trips t ON t.id = ir.trip_id
    WHERE ir.id = ?
    LIMIT 1
    `,
      [id],
    );

    if (!req) return { success: true };

    if (req.owner_id !== loggedInUserId || req.creator_id !== loggedInUserId) {
      throw new ForbiddenException('You cannot reject this request');
    }

    if (req.status !== 'pending') {
      throw new BadRequestException('Request already handled');
    }

    await this.db.query(
      `
    UPDATE interest_requests
    SET status = 'rejected'
    WHERE id = ? AND status = 'pending'
    `,
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
