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





import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule], // 🔥 REQUIRED
  providers: [ChatGateway],
})
export class ChatModule {}



import { Controller, Post, Get, Req, Body } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('start')
  async startConversation(@Req() req, @Body() body) {
    const userId = verifyToken(req);
    const otherUserId = Number(body.otherUserId);
    return this.conversationsService.startConversation(userId, otherUserId);
  }

  @Get()
  async getUserConversations(@Req() req) {
    const userId = verifyToken(req);
    return this.conversationsService.getUserConversations(userId);
  }
}


import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { DatabaseModule } from 'src/database/database.module';
@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}


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


import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateInterestRequestDto {
  @IsNotEmpty()
  @IsNumber()
  tripId: number;

  @IsNotEmpty()
  @IsNumber()
  ownerId: number;
}


import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('interest_requests')
export class InterestRequestsController {
  constructor(
    private readonly interestRequestsService: InterestRequestsService,
  ) {}

  @Post()
  create(
    @Req() req,
    @Body() createInterestRequestDto: CreateInterestRequestDto,
  ) {
    const userId = verifyToken(req);

    if (userId === createInterestRequestDto.ownerId) {
      throw new BadRequestException(
        'You cannot request interest on your own trip',
      );
    }

    return this.interestRequestsService.create(
      createInterestRequestDto,
      userId,
    );
  }

  @Get('status/:tripId')
  getStatus(@Param('tripId') tripId: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.getStatus(+tripId, userId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.acceptRequest(+id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestRequestsService.remove(+id);
  }
}


import { Module } from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { InterestRequestsController } from './interest_requests.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [InterestRequestsController],
  providers: [InterestRequestsService],
})
export class InterestRequestsModule {}


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


import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async insertMessage(@Req() req, @Body() body: any) {
    const userId = verifyToken(req);
    return this.messagesService.insertMessage(userId, body);
  }

  @Get(':conversationId')
  async getMessages(
    @Req() req,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = verifyToken(req);
    return this.messagesService.getMessages(userId, Number(conversationId));
  }
}


import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}


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



import { Controller, Get, Patch, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // unread only (badge)
  @Get()
  findUnread(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.findUnread(userId);
  }

  // all notifications (screen)
  @Get('all')
  findAll(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.findAll(userId);
  }

  @Patch('mark-read')
  markAllRead(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.markAllRead(userId);
  }
}


import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verifySocketToken } from 'src/utils/jwt.utils';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Map userId -> set of socketIds
  private clients = new Map<number, Set<string>>();

  afterInit() {
    this.logger.log('NotificationsGateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      // Try to extract token directly from handshake
      let tokenUserId: number | null = null;
      try {
        tokenUserId = verifySocketToken(client);
      } catch (e) {
        tokenUserId = null;
      }

      this.logger.log(
        `Client connected: ${client.id} (handshakeUid=${tokenUserId}) handshakeHeaders=${JSON.stringify(
          client.handshake.headers || {},
        )}`,
      );

      if (tokenUserId) {
        this.addClientMapping(tokenUserId, client.id);
        this.logger.log(`Mapped user ${tokenUserId} -> socket ${client.id}`);
      }

      client.on('identify', (data) => {
        try {
          const uid = Number(data?.userId);
          if (!Number.isNaN(uid) && uid > 0) {
            this.addClientMapping(uid, client.id);
            this.logger.log(
              `Identify received: mapped user ${uid} -> socket ${client.id}`,
            );
            client.emit('identify_ack', { success: true, userId: uid });
          } else {
            this.logger.debug(
              `Identify received with invalid uid: ${JSON.stringify(data)}`,
            );
            client.emit('identify_ack', { success: false });
          }
        } catch (err) {
          this.logger.error('Error in identify handler', err as any);
          client.emit('identify_ack', { success: false });
        }
      });

      client.on('disconnecting', () => {
        this.removeSocketFromAllMappings(client.id);
        this.logger.log(
          `Client disconnecting: ${client.id} - removed mappings where present`,
        );
      });

      client.on('disconnect', (reason) => {
        this.removeSocketFromAllMappings(client.id);
        this.logger.log(`Client disconnected: ${client.id} reason=${reason}`);
      });
    } catch (err) {
      this.logger.warn(
        `Connection rejected for socket ${client.id}`,
        (err as any)?.message,
      );
      try {
        client.disconnect(true);
      } catch (e) {
        this.logger.error('Failed to force-disconnect client', e as any);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.removeSocketFromAllMappings(client.id);
    this.logger.log(
      `handleDisconnect cleaned mappings for socket ${client.id}`,
    );
  }

  private addClientMapping(userId: number, socketId: string) {
    const existing = this.clients.get(userId) || new Set<string>();
    existing.add(socketId);
    this.clients.set(userId, existing);
  }

  private removeSocketFromAllMappings(socketId: string) {
    for (const [userId, socketSet] of this.clients.entries()) {
      if (socketSet.has(socketId)) {
        socketSet.delete(socketId);
        if (socketSet.size === 0) {
          this.clients.delete(userId);
        } else {
          this.clients.set(userId, socketSet);
        }
        this.logger.log(
          `Removed mapping for user ${userId} (socket ${socketId})`,
        );
        break;
      }
    }
  }

  sendNotification(userId: number, payload: any) {
    const socketSet = this.clients.get(userId);
    if (socketSet && socketSet.size > 0) {
      for (const socketId of socketSet) {
        this.logger.log(
          `Emitting new_notification to user ${userId} on socket ${socketId}`,
        );
        this.server.to(socketId).emit('new_notification', payload);
      }
    } else {
      this.logger.log(`No connected sockets for user ${userId}, skipping emit`);
    }
  }

  sendDeletion(userId: number, interestRequestId: number) {
    const socketSet = this.clients.get(userId);
    if (socketSet && socketSet.size > 0) {
      for (const socketId of socketSet) {
        this.logger.log(
          `Emitting notification_deleted to user ${userId} (socket ${socketId}) interestRequestId=${interestRequestId}`,
        );
        this.server.to(socketId).emit('notification_deleted', {
          interestRequestId,
        });
      }
    } else {
      this.logger.log(
        `No connected sockets for user ${userId}, cannot emit deletion`,
      );
    }
  }

  // ------------------------------------------------------
  // ⭐ NEW: BROADCAST TRIP DELETION TO ALL USERS
  // ------------------------------------------------------
  sendTripDeleted(tripId: number) {
    this.logger.log(`Broadcasting trip_deleted tripId=${tripId}`);
    this.server.emit('trip_deleted', { tripId });
  }
}


// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],

  // ⭐ FIX: Export the gateway so other modules (PostModule) can use it
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}



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

      try {
        this.gateway.sendNotification(receiverId, notif);
      } catch (e) {
        this.logger.error('Emit failed', e as any);
      }
    }

    return notif;
  }

  // unread (badge)
  async findUnread(receiverId: number) {
    const [rows]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_name,
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

  // full list (screen)
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


import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePhotoDto {
  @IsNotEmpty()
  @IsString()
  photo_url: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  description?: string;
}



import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  from: string;

  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  to: string;

  @IsNotEmpty({ message: 'Please enter a valid date' })
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt({ message: 'Seats must be a number' })
  seatsAvailable: number;

  @IsString()
  description: string;

  @IsEnum(['Offering', 'Searching'], {
    message: 'Type must be Offering or Searching',
  })
  type: 'Offering' | 'Searching';
}


// src/post/post.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { verifyToken } from 'src/utils/jwt.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Req() req, @Body() createPostDto: CreatePostDto) {
    const userId = verifyToken(req);
    return this.postService.create(createPostDto, userId);
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }

  // ---------- STATIC ROUTES (MUST BE BEFORE :id) ----------
  @Get('nearby')
  findNearby(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;

    if (lat && Number.isNaN(parsedLat)) {
      throw new BadRequestException('lat must be a valid number');
    }
    if (lng && Number.isNaN(parsedLng)) {
      throw new BadRequestException('lng must be a valid number');
    }

    return this.postService.findNearby(parsedLat ?? 0, parsedLng ?? 0);
  }

  @Get('user/:id')
  findByUser(@Param('id') id: string) {
    return this.postService.findByUser(Number(id));
  }

  @Get('my-trips')
  findMyTrips(@Req() req) {
    return this.postService.findMyTrips(verifyToken(req));
  }

  // ---------- PHOTOS ----------
  @Post('photo')
  createPhoto(@Req() req, @Body() dto: CreatePhotoDto) {
    return this.postService.createPhoto(dto, verifyToken(req));
  }

  @Get('photos')
  getAllPhotos(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.postService.getAllPhotos(
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
  }

  @Get('photos/:userId')
  getPhotosByUser(@Param('userId') userId: string) {
    return this.postService.getPhotosByUser(Number(userId));
  }

  // ---------- DELETE (must be BEFORE :id but AFTER static routes) ----------
  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    const userId = verifyToken(req);
    const parsed = Number(id);
    if (Number.isNaN(parsed)) throw new BadRequestException('Invalid trip id');

    return this.postService.delete(parsed, userId); // ✅ CORRECT
  }

  // ---------- THIS MUST BE LAST ----------
  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsed = Number(id);
    if (Number.isNaN(parsed)) throw new BadRequestException('Invalid trip id');
    return this.postService.findOne(parsed);
  }
}


import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PostController],
  providers: [PostService, NotificationsGateway],
})
export class PostModule {}



import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { getCoordinates } from 'src/utils/geocoding.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';

// ⭐ Add this import so we can broadcast trip deletion
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class PostService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly notificationsGateway: NotificationsGateway, // ⭐ inject gateway
  ) {}

  async create(createPostDto: CreatePostDto, userId: number) {
    const { from, to, date, seatsAvailable, description, type } = createPostDto;

    const from_location = await getCoordinates(from);
    const to_location = await getCoordinates(to);

    const from_lat = from_location.lat;
    const from_lng = from_location.lng;
    const to_lat = to_location.lat;
    const to_lng = to_location.lng;

    try {
      const [rows]: any = await this.db.query(
        'SELECT COUNT(*) AS count FROM trips WHERE creator_id = ?',
        [userId],
      );
      const userPostCount = rows[0].count;

      if (userPostCount >= 3) {
        throw new BadRequestException(
          'You have reached the maximum number of posts',
        );
      }

      await this.db.query(
        `INSERT INTO trips (
          creator_id, origin, destination, trip_date,
          available_seats, description, type,
          origin_lat, origin_lng, destination_lat, destination_lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          from,
          to,
          date,
          seatsAvailable,
          description,
          type,
          from_lat,
          from_lng,
          to_lat,
          to_lng,
        ],
      );

      return { message: 'Trip registered successfully' };
    } catch (error) {
      console.error('❌ Database Error (create):', error);
      throw error;
    }
  }

  async findAll() {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         ORDER BY trip_date DESC`,
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findAll):', error);
      throw error;
    }
  }

  async findNearby(userLat: number, userLng: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT 
          trips.*, 
          users.first_name,
          users.profile_photo,
          (6371 * acos(
            cos(radians(?)) *
            cos(radians(origin_lat)) *
            cos(radians(origin_lng) - radians(?)) +
            sin(radians(?)) *
            sin(radians(origin_lat))
          )) AS distance
        FROM trips
        JOIN users ON trips.creator_id = users.id
        ORDER BY distance ASC`,
        [userLat, userLng, userLat],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findNearby):', error);
      throw error;
    }
  }

  async findByUser(userId: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         WHERE creator_id = ?
         ORDER BY trip_date DESC`,
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findByUser):', error);
      throw error;
    }
  }

  async findMyTrips(userId: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         WHERE creator_id = ?
         ORDER BY trip_date DESC`,
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findMyTrips):', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const [rows]: any = await this.db.query(
        `SELECT 
          trips.*, 
          users.first_name, 
          users.profile_photo
        FROM trips
        JOIN users ON trips.creator_id = users.id
        WHERE trips.id = ?
        LIMIT 1`,
        [id],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Trip not found');
      }

      const r = rows[0];

      return {
        id: r.id,
        from: r.origin,
        to: r.destination,
        date: r.trip_date,
        seatsAvailable: r.available_seats,
        description: r.description,
        tripType: r.type,
        creatorId: r.creator_id,
        firstName: r.first_name,
        profilePhoto: r.profile_photo,
        distance: null,
      };
    } catch (error) {
      console.error('❌ Database Error (findOne):', error);
      throw error;
    }
  }

  // ---------------------------------------------------
  // ⭐ NEW: DELETE TRIP (with ownership check + broadcast)
  // ---------------------------------------------------
  // ---------------------------------------------------
  // DELETE TRIP (safe delete with FK cleanup)
  // ---------------------------------------------------
  async delete(tripId: number, userId: number) {
    try {
      // 1️⃣ Verify ownership
      const [rows]: any = await this.db.query(
        'SELECT creator_id FROM trips WHERE id = ? LIMIT 1',
        [tripId],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Trip not found');
      }

      if (rows[0].creator_id !== userId) {
        throw new ForbiddenException('You cannot delete this trip');
      }

      // 2️⃣ DELETE all notifications linked to the trip
      await this.db.query('DELETE FROM notifications WHERE trip_id = ?', [
        tripId,
      ]);

      // 3️⃣ DELETE interest requests linked to this trip
      await this.db.query('DELETE FROM interest_requests WHERE trip_id = ?', [
        tripId,
      ]);

      // 4️⃣ Now delete the trip safely
      await this.db.query('DELETE FROM trips WHERE id = ?', [tripId]);

      // 5️⃣ Broadcast real-time deletion
      this.notificationsGateway.sendTripDeleted(tripId);

      return { message: 'Trip deleted successfully' };
    } catch (error) {
      console.error('❌ Database Error (delete):', error);
      throw error;
    }
  }

  // ---------------------------
  // PHOTO SECTION
  // ---------------------------

  async createPhoto(createPhotoDto: CreatePhotoDto, userId: number) {
    const { photo_url, location, description } = createPhotoDto;

    try {
      if (!location || location.trim().length === 0) {
        throw new BadRequestException('Location is required');
      }

      const coords = await getCoordinates(location);

      if (!coords || !coords.lat || !coords.lng) {
        throw new BadRequestException('Invalid location');
      }

      const { lat, lng } = coords;

      await this.db.query(
        `INSERT INTO photos 
        (user_id, photo_url, location, description, photo_lat, photo_lng)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, photo_url, location, description, lat, lng],
      );

      return { message: 'Photo post created successfully' };
    } catch (error) {
      console.error('❌ Database Error (createPhoto):', error);
      throw error;
    }
  }

  async getAllPhotos(userLat?: number, userLng?: number) {
    try {
      if (!userLat || !userLng) {
        const [rows]: any = await this.db.query(
          `SELECT 
            photos.id,
            photos.photo_url,
            photos.location,
            photos.description,
            photos.created_at,
            users.first_name,
            users.profile_photo
          FROM photos
          JOIN users ON photos.user_id = users.id
          ORDER BY photos.created_at DESC`,
        );
        return rows;
      }

      const [rows]: any = await this.db.query(
        `SELECT 
            photos.id,
            photos.photo_url,
            photos.location,
            photos.description,
            photos.created_at,
            photos.photo_lat,
            photos.photo_lng,
            users.first_name,
            users.profile_photo,
            (6371 * acos(
              cos(radians(?)) *
              cos(radians(photo_lat)) *
              cos(radians(photo_lng) - radians(?)) +
              sin(radians(?)) *
              sin(radians(photo_lat))
            )) AS distance
         FROM photos
         JOIN users ON photos.user_id = users.id
         WHERE photo_lat IS NOT NULL AND photo_lng IS NOT NULL
         ORDER BY distance ASC`,
        [userLat, userLng, userLat],
      );

      return rows;
    } catch (error) {
      console.error('❌ Database Error (getAllPhotos):', error);
      throw error;
    }
  }

  async getPhotosByUser(userId: number) {
    try {
      const [data] = await this.db.query(
        `SELECT * FROM photos WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
      );
      return data;
    } catch (error) {
      console.error('❌ Database Error (getPhotosByUser):', error);
      throw error;
    }
  }
}



// src/navigation/BottomNavigator.js
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useContext } from "react";
import { Image, View, Text } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import MessagesScreen from "../screens/MessagesScreen";
import PostScreen from "../screens/PostScreen";
import ProfilePassengerView from "../screens/ProfilePassengerView";
import NotificationsScreen from "../screens/NotificationScreen";

import { NotificationContext } from "../context/NotificationContext";
import { MessageContext } from "../context/MessageContext";

const Tab = createBottomTabNavigator();

const NotificationTabIcon = ({ focused }) => {
  const { unreadCount } = useContext(NotificationContext);

  return (
    <View>
      <Image
        source={require("../assets/notifications.png")}
        style={{
          width: 35,
          height: 35,
          tintColor: focused ? "white" : "#7282ab",
        }}
      />

      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: "white",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#061237",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </View>
  );
};

const MessageTabIcon = ({ focused }) => {
  const { unreadMessages } = useContext(MessageContext);

  return (
    <View>
      <Image
        source={require("../assets/messages.png")}
        style={{
          width: 35,
          height: 35,
          tintColor: focused ? "white" : "#7282ab",
        }}
      />

      {unreadMessages > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: "white",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#061237",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadMessages > 99 ? "99+" : String(unreadMessages)}
          </Text>
        </View>
      )}
    </View>
  );
};

const BottomNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          borderRadius: 30,
          backgroundColor: "rgba(5, 22, 80, 0.7)",
          borderWidth: 0.3,
          borderColor: "rgba(255,255,255,0.1)",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 5 },
          shadowRadius: 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "#7282ab",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/home.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ focused }) => <MessageTabIcon focused={focused} />,
        }}
      />

      <Tab.Screen
        name="Post"
        component={PostScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/post.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <NotificationTabIcon focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfilePassengerView}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/profile.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;



// src/common/Chat.js
import React from "react";
import { Text, View, Image, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../styles/ChatItem_styles";

const Chat = ({ conversation }) => {
  const navigation = useNavigation();

  const {
    conversationId,
    otherUserId,
    otherUserName,
    otherUserPhoto,
    lastMessageText,
    lastMessageTime,
    unreadCount,
  } = conversation;

  const isUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={() =>
        navigation.navigate("Chat", {
          conversationId,
          receiverId: otherUserId,
          receiverName: otherUserName,
          receiverPhoto: otherUserPhoto,
        })
      }
    >
      {/* Profile Picture */}
      <Image
        source={
          otherUserPhoto
            ? { uri: otherUserPhoto }
            : require("../assets/profile-picture.jpeg")
        }
        style={styles.profileImage}
      />

      {/* Middle Section */}
      <View style={styles.middle}>
        <Text style={[styles.name, isUnread && styles.nameUnread]}>
          {otherUserName}
        </Text>

        <Text
          style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {lastMessageText || "No messages yet"}
        </Text>
      </View>

      {/* Right Side: Time + Badge */}
      <View style={styles.rightSection}>
        <Text style={styles.time}>
          {lastMessageTime
            ? new Date(lastMessageTime).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            : ""}
        </Text>

        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default Chat;






// src/common/TravelCard.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import styles from "../styles/TravelCard_styles";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";
import { countryFlags } from "../common/Flags";

const getFlagForLocation = (location) => {
  if (!location || typeof location !== "string") return "";
  const parts = location.split(",");
  const country = parts[parts.length - 1].trim();
  return countryFlags[country] || "";
};

const TravelCard = ({
  firstName,
  from,
  to,
  date,
  seatsAvailable,
  description,
  tripType,
  distance,
  creatorId,
  tripId,
  profilePhoto,
  initialStatus,
  embeddedMode,
  notifType,
  interestRequestId,

  // Used in notification popup
  senderId,
  senderName,
  senderPhoto,

  // NEW for collapse animation
  onTripDeleted,
}) => {
  if (!tripId || isNaN(Number(tripId))) {
    console.log("❌ INVALID tripId passed to TravelCard:", tripId);
    return null;
  }

  const navigation = useNavigation();

  // -----------------------------------
  // STATE
  // -----------------------------------
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(initialStatus ?? null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // -----------------------------------
  // ANIMATION VALUES
  // -----------------------------------
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const collapseAnim = useRef(new Animated.Value(1)).current;

  // -----------------------------------
  // LOAD USER ID
  // -----------------------------------
  useEffect(() => {
    const loadUser = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      if (storedId) setCurrentUserId(parseInt(storedId, 10));
    };
    loadUser();
  }, []);

  const isOwner = currentUserId === creatorId;

  // -----------------------------------
  // STATUS LOADING
  // -----------------------------------
  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus !== undefined) return;

    const loadStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (data.status) setStatus(data.status);
        else setStatus(null);
      } catch (err) {
        console.log("Status fetch error:", err);
      }
    };

    loadStatus();
  }, [tripId]);

  // -----------------------------------
  // SOCKET LISTENERS
  // -----------------------------------
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = (notif) => {
        try {
          if (
            notif?.type === "interest_accepted" &&
            notif?.trip_id === tripId
          ) {
            setStatus("accepted");
          }

          if (
            notif?.type === "interest_request_deleted" &&
            notif?.trip_id === tripId
          ) {
            setStatus(null);
          }
        } catch {}
      };

      socket.on("new_notification", handler);
      return () => socket.off("new_notification", handler);
    });
  }, [tripId]);

  // -----------------------------------
  // SEND INTEREST
  // -----------------------------------
  const handleInterest = async () => {
    if (isRequesting || status === "pending" || status === "accepted") return;

    setIsRequesting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/interest_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId, ownerId: creatorId }),
      });

      const data = await res.json();
      if (data?.status) setStatus(data.status);
      else setStatus("pending");
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  // -----------------------------------
  // DELETE TRIP (with collapse animation)
  // -----------------------------------
  const handleDeleteTrip = async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await fetch(`${BASE_URL}/post/${tripId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Animate the collapse
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(collapseAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onTripDeleted) onTripDeleted(tripId);
      });
    } catch (err) {
      console.log("❌ Delete trip error:", err);
      setIsDeleting(false);
    }
  };

  // -----------------------------------
  // FORMAT UI VALUES
  // -----------------------------------
  const originCity = from?.split(",")[0]?.trim() || "";
  const destinationCity = to?.split(",")[0]?.trim() || "";

  const originFlag = getFlagForLocation(from);
  const destinationFlag = getFlagForLocation(to);

  let formattedDate = "";
  if (date) {
    formattedDate = new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
    formattedDate =
      formattedDate.charAt(0).toLowerCase() + formattedDate.slice(1);
  }

  const [avatarSource, setAvatarSource] = useState(
    require("../assets/profile-picture.jpeg")
  );

  useEffect(() => {
    const loadAvatar = async () => {
      if (profilePhoto) {
        setAvatarSource({ uri: profilePhoto });
        return;
      }
      const stored = await AsyncStorage.getItem("profilePhoto");
      if (stored) {
        setAvatarSource({ uri: stored });
        return;
      }
    };
    loadAvatar();
  }, [profilePhoto]);

  const buttonLabel =
    status === null
      ? "Interested"
      : status === "pending"
      ? "Pending"
      : "Send Message";

  const chatUserId = embeddedMode && senderId ? senderId : creatorId;
  const chatUserName = embeddedMode && senderName ? senderName : firstName;
  const chatUserPhoto =
    embeddedMode && senderPhoto ? senderPhoto : profilePhoto;

  // -----------------------------------
  // RENDER
  // -----------------------------------
  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scaleY: collapseAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9}>
        <View>
          {/* PROFILE HEADER */}
          <View style={styles.rowCenter}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: creatorId })
              }
              style={styles.profilePicture}
            >
              <Image
                source={avatarSource}
                resizeMode="cover"
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <View style={styles.columnStart}>
              <Text style={styles.firstName}>{firstName}</Text>

              <View style={styles.seekingRideContainer}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {tripType}
                </Text>
              </View>
            </View>
          </View>

          {/* LOGO + DISTANCE */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            {distance != null && (
              <Text style={styles.distanceText}>
                {distance < 1 ? "Nearby" : `${distance.toFixed(0)} km away`}
              </Text>
            )}
          </View>

          {/* DESTINATION */}
          <View style={styles.destination}>
            <Text
              style={styles.destinationText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {originCity} {originFlag} → {destinationCity} {destinationFlag}
            </Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>

          {/* DESCRIPTION EXPAND */}
          <TouchableOpacity
            style={styles.description}
            onPress={() => setExpanded(!expanded)}
          >
            <Text
              style={styles.descriptionText}
              numberOfLines={expanded ? undefined : 3}
            >
              {description}
            </Text>
          </TouchableOpacity>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.seatsAvailable}>
              {seatsAvailable} Seats available
            </Text>

            {/* OWNER DELETE BUTTON */}
            {isOwner && (
              <TouchableOpacity
                onPress={handleDeleteTrip}
                style={[
                  styles.button,
                  {
                    backgroundColor: "#d11",
                    width: 120,
                  },
                ]}
              >
                {isDeleting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={[styles.buttonText, { color: "white" }]}>
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* NON-OWNER BUTTONS */}
            {!embeddedMode && !isOwner && (
              <TouchableOpacity
                style={[
                  styles.button,
                  isRequesting || status === "pending"
                    ? { opacity: 0.6 }
                    : undefined,
                ]}
                onPress={async () => {
                  if (status === "accepted") {
                    const token = await AsyncStorage.getItem("token");

                    const res = await fetch(`${BASE_URL}/conversations/start`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        otherUserId: creatorId,
                      }),
                    });

                    const data = await res.json();
                    const conversationId = data.conversationId;

                    navigation.navigate("Chat", {
                      conversationId,
                      receiverId: creatorId,
                      receiverName: firstName,
                      receiverPhoto: profilePhoto,
                    });
                  } else {
                    handleInterest();
                  }
                }}
                disabled={isRequesting || status === "pending"}
              >
                <Text style={styles.buttonText}>{buttonLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default TravelCard;


import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady, connectSocket } from "../socket";
import BASE_URL from "../config/api";
import { AppState } from "react-native";

export const NotificationContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);
  const listenersAttached = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const fetchInitialUnread = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;

      if (mountedRef.current) setUnreadCount(count);
    } catch {}
  };

  const initSocketSafely = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) return;

    await connectSocket();
    fetchInitialUnread();
  };

  useEffect(() => {
    initSocketSafely();
  }, []);

  // Re-identify on resume
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const socket = getSocket();
        const userId = await AsyncStorage.getItem("userId");
        if (socket && socket.connected && userId) {
          socket.emit("identify", { userId });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // FIX: attach socket listeners only ONCE
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket || listenersAttached.current) return;

      socket.off("new_notification");
      socket.on("new_notification", () => {
        setUnreadCount((prev) => prev + 1);
      });

      listenersAttached.current = true;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};



// src/screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  RefreshControl,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import TravelCard from "../common/TravelCard";
import PhotoCard from "../common/PhotoCard";
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const HomeScreen = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // ----------------------------------------------------
  // DELETE HANDLER (fixes the big empty space)
  // ----------------------------------------------------
  const handleTripDeleted = (deletedId) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    setFilteredItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  // ----------------------------------------------------
  // FETCH ALL TRIPS + PHOTOS
  // ----------------------------------------------------
  const fetchAll = async (lat, lng) => {
    try {
      const [tripsRes, photosRes] = await Promise.all([
        fetch(`${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`),
        fetch(`${BASE_URL}/post/photos?lat=${lat}&lng=${lng}`),
      ]);

      const trips = await tripsRes.json().catch(() => []);
      const rawPhotos = await photosRes.json().catch(() => []);

      const photos = Array.isArray(rawPhotos) ? rawPhotos : [];

      const merged = [
        ...trips.map((t) => ({ ...t, feedType: "trip" })),
        ...photos.map((p) => ({ ...p, feedType: "photo" })),
      ];

      merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setItems(merged);
    } catch (e) {
      console.log("❌ Fetch error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // ----------------------------------------------------
  // LOAD LOCATION + FETCH
  // ----------------------------------------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      fetchAll(lat, lng);
    })();
  }, []);

  // ----------------------------------------------------
  // SOCKET LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => {
        if (userLat && userLng) fetchAll(userLat, userLng);
      });

      socket.on("trip_deleted", ({ tripId }) => {
        console.log("🔥 Trip deleted event received:", tripId);
        handleTripDeleted(tripId);
      });

      return () => {
        socket.off("new_notification");
        socket.off("trip_deleted");
      };
    });
  }, [userLat, userLng]);

  // ----------------------------------------------------
  // SEARCH FILTER
  // ----------------------------------------------------
  useEffect(() => {
    if (!search.trim()) {
      setFilteredItems(items);
      return;
    }

    const lower = search.toLowerCase();

    const results = items.filter((it) => {
      const a = it.origin ?? "";
      const b = it.destination ?? "";
      return `${a} ${b}`.toLowerCase().includes(lower);
    });

    setFilteredItems(results);
  }, [search, items]);

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlashList
          data={filteredItems}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(userLat, userLng)}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search trips..."
                placeholderTextColor="#9bb0d4"
                style={styles.searchBar}
              />
            </View>
          }
          renderItem={({ item }) => {
            if (item.feedType === "photo") {
              return (
                <PhotoCard
                  userName={item.first_name}
                  caption={item.description}
                  photos={[item.photo_url]}
                  profilePhoto={item.profile_photo}
                />
              );
            }

            if (item.feedType === "trip") {
              const tripLabel = item.trip_type || item.type || "trip";

              return (
                <TravelCard
                  from={item.origin}
                  to={item.destination}
                  date={item.trip_date}
                  seatsAvailable={item.available_seats}
                  description={item.description}
                  tripType={tripLabel}
                  firstName={item.first_name}
                  distance={item.distance}
                  creatorId={item.creator_id}
                  tripId={item.id}
                  profilePhoto={item.profile_photo}
                  onTripDeleted={handleTripDeleted} // ⭐ FIX ADDED
                />
              );
            }

            return null;
          }}
          estimatedItemSize={400}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;


// src/screens/MessagesScreen.js
import React, { useEffect, useState } from "react";
import { View, TextInput, Image, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import styles from "../styles/MessagesScreen_styles";
import Chat from "../common/Chat";
import { getSocket, onSocketReady } from "../socket";
import { useIsFocused } from "@react-navigation/native";

const MessagesScreen = () => {
  const [conversations, setConversations] = useState([]);
  const isFocused = useIsFocused();

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setConversations([]);
        return;
      }

      const res = await fetch(`${BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
    } catch {
      setConversations([]);
    }
  };

  // Refresh whenever screen is opened again
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handleNewMessage = () => load();

      const handleConversationUpdate = (preview) => {
        setConversations((prev) => {
          const idx = prev.findIndex(
            (c) => c.conversationId === preview.conversationId
          );
          if (idx === -1) return [preview, ...prev];
          const updated = [...prev];
          updated[idx] = preview;
          return updated;
        });
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("conversationUpdate", handleConversationUpdate);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("conversationUpdate", handleConversationUpdate);
      };
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Image
          source={require("../assets/searchIcon.png")}
          resizeMode="cover"
          style={styles.searchIcon}
        />

        <TextInput
          placeholderTextColor={"rgb(87,107,134)"}
          placeholder="Search"
          style={styles.searchBarTextInput}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {conversations.map((c) => (
          <Chat key={c.conversationId} conversation={c} />
        ))}
      </ScrollView>
    </View>
  );
};

export default MessagesScreen;



// src/screens/NotificationScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { getSocket, onSocketReady } from "../socket";
import BASE_URL from "../config/api";
import { NotificationContext } from "../context/NotificationContext";
import TravelCard from "../common/TravelCard";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const { setUnreadCount } = useContext(NotificationContext);

  const isFocused = useIsFocused();

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const load = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/notifications/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  const openTripPopup = async (notification) => {
    if (!notification) return;

    const tripId = notification.trip_id;
    setPopupLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/post/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tripData = await res.json();

      // ⭐ ADD THESE 3 FIELDS
      const senderId = notification.sender_id;
      const senderName = notification.sender_name;
      const senderPhoto = notification.sender_photo;

      setSelectedTrip({
        ...tripData,
        tripId: tripData.id,
        creatorId: tripData.creator_id,
        interestRequestId: notification.interest_request_id,
        notifType: notification.type,

        // ⭐ REQUIRED FIX FOR CORRECT CHAT TARGET
        senderId,
        senderName,
        senderPhoto,
      });
    } catch (err) {
      console.log("Popup load error:", err);
    }

    setPopupLoading(false);
  };

  const closePopup = () => setSelectedTrip(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => load());
      socket.on("notification_deleted", () => load());
    });

    return () => {
      const socket = getSocket();
      socket?.off("new_notification");
      socket?.off("notification_deleted");
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      setUnreadCount(0);
    }
  }, [isFocused]);

  if (!notifications || notifications.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: "#061237" }]}>
        <Text style={{ color: "white", fontSize: 18 }}>
          No notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((n, i) => (
          <TouchableOpacity
            key={n.id || i}
            style={styles.bubble}
            onPress={() => openTripPopup(n)}
          >
            <View style={styles.headerRow}>
              <Image
                source={{
                  uri: n.sender_photo || "https://i.stack.imgur.com/l60Hf.png",
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{n.sender_name}</Text>
            </View>

            <Text style={styles.message}>{n.message}</Text>

            {n.type === "interest_request" && (
              <View style={styles.buttonsRowCircle}>
                <TouchableOpacity
                  onPress={async () => {
                    const token = await AsyncStorage.getItem("token");
                    try {
                      await fetch(
                        `${BASE_URL}/interest_requests/${n.interest_request_id}/accept`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      load();
                      setUnreadCount((prev) => Math.max(prev - 1, 0));
                    } catch {}
                  }}
                  style={styles.circleBtn}
                >
                  <Text style={styles.circleText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setNotifications((prev) =>
                      prev.filter((x) => x.id !== n.id)
                    );
                    setUnreadCount((prev) => Math.max(prev - 1, 0));
                  }}
                  style={styles.circleBtn}
                >
                  <Text style={styles.circleText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(selectedTrip || popupLoading) && (
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popupContainer}>
                {popupLoading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <TravelCard
                      {...selectedTrip}
                      embeddedMode={true}
                      tripId={selectedTrip?.tripId}
                      creatorId={selectedTrip?.creatorId}
                      notifType={selectedTrip?.notifType}
                      interestRequestId={selectedTrip?.interestRequestId}
                      // ⭐ ADD THESE 3 LINES
                      senderId={selectedTrip?.senderId}
                      senderName={selectedTrip?.senderName}
                      senderPhoto={selectedTrip?.senderPhoto}
                    />
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061237" },
  scrollContent: { paddingTop: 40, paddingHorizontal: 18, paddingBottom: 120 },

  bubble: {
    backgroundColor: "#020d2d",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 28, marginRight: 12 },
  name: { color: "white", fontSize: 18, fontWeight: "600" },

  message: { color: "#d7d9e8", fontSize: 16, marginBottom: 16, lineHeight: 22 },

  buttonsRowCircle: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: 8,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    color: "#061237",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: -2,
  },

  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  popupContainer: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "transparent",
  },
});



import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import React, { useState } from "react";
import styles from "../styles/PostScreen_styles";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessMessageBox from "../common/SuccessMessageBox";
import { GOOGLE_API_KEY } from "@env";
import BASE_URL from "../config/api";
import * as ImagePicker from "expo-image-picker";

let fromTimeout;
let toTimeout;

const PostScreen = () => {
  const navigation = useNavigation();

  const [selectedMain, setSelectedMain] = useState("trip");
  const [tripType, setTripType] = useState("Offering");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  const [photoLocationSuggestions, setPhotoLocationSuggestions] = useState([]);

  const [date, setDate] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState(null);

  // CLOUDINARY
  const CLOUD_NAME = "del5ajmby";
  const UPLOAD_PRESET = "profile_preset";

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
    data.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handlePhotoPost = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    let uploadedPhotoUrl = null;

    if (photo) {
      uploadedPhotoUrl = await uploadToCloudinary(photo);
    }

    await fetch(`${BASE_URL}/post/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        photo_url: uploadedPhotoUrl,
        description,
        location,
      }),
    });
  };

  /** FETCH GOOGLE CITY SUGGESTIONS */
  let timeouts = { from: null, to: null, photoLocation: null };

  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 2) {
      if (type === "from") setFromSuggestions([]);
      else if (type === "to") setToSuggestions([]);
      else if (type === "photoLocation") setPhotoLocationSuggestions([]);
      return;
    }

    clearTimeout(timeouts[type]);
    timeouts[type] = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_API_KEY}&language=en&types=(cities)`
        );
        const data = await res.json();

        const simplified =
          data?.predictions?.map((item) => ({
            id: item.place_id,
            name: item.description,
          })) || [];

        if (type === "from") setFromSuggestions(simplified);
        else if (type === "to") setToSuggestions(simplified);
        else if (type === "photoLocation")
          setPhotoLocationSuggestions(simplified);
      } catch (e) {
        console.error(`${type} fetch error:`, e);
      }
    }, 120);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Post</Text>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </View>

      {/* MAIN TABS */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "trip" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("trip")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "trip" && styles.activeMainText,
            ]}
          >
            Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "photo" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("photo")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "photo" && styles.activeMainText,
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* INPUTS */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* TRIP MODE */}
          {selectedMain === "trip" && (
            <View style={styles.tripInfoWrapper}>
              <View style={styles.tripInfo}>
                {/* Trip type */}
                <View style={styles.subTabInsideBox}>
                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Offering" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Offering")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Offering" && styles.activeSubText,
                      ]}
                    >
                      Offering
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Searching" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Searching")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Searching" && styles.activeSubText,
                      ]}
                    >
                      Searching
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* FROM */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="From"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={from}
                      onChangeText={(text) => {
                        setFrom(text);
                        fetchSuggestions(text, "from");
                      }}
                      onFocus={() => setToSuggestions([])}
                    />
                  </View>

                  {fromSuggestions.length > 0 && (
                    <FlatList
                      data={fromSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setFrom(item.name);
                            setFromSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* TO */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="To"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={to}
                      onChangeText={(text) => {
                        setTo(text);
                        fetchSuggestions(text, "to");
                      }}
                      onFocus={() => setFromSuggestions([])}
                    />
                  </View>

                  {toSuggestions.length > 0 && (
                    <FlatList
                      data={toSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setTo(item.name);
                            setToSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* DATE + SEATS */}
                <View style={styles.dateAndSeatsContainer}>
                  <View style={styles.dateAndIcon}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                      <Image
                        source={require("../assets/dateIcon.png")}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Date (YYYY-MM-DD)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.smallInput}
                      value={date}
                      editable={false}
                    />
                  </View>

                  <TextInput
                    placeholder={
                      tripType === "Offering"
                        ? "Seats available"
                        : "Seats needed"
                    }
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.smallInput}
                    onChangeText={setSeatsAvailable}
                  />
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const formatted = selectedDate
                          .toISOString()
                          .split("T")[0];
                        setDate(formatted);
                      }
                    }}
                  />
                )}

                <TextInput
                  placeholder="Description"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.descriptionTextInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          )}

          {/* PHOTO MODE */}
          {selectedMain === "photo" && (
            <View style={styles.photoContainer}>
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: "100%", borderRadius: 15 }}
                  />
                ) : (
                  <>
                    <Image
                      source={require("../assets/uploadIcon.png")}
                      style={styles.uploadIcon}
                    />
                    <Text style={styles.uploadText}>Upload photo</Text>
                    <Text style={styles.uploadHint}>
                      Tap to select from gallery
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* LOCATION + DROPDOWN */}
              <View style={{ position: "relative", marginBottom: 10 }}>
                <TextInput
                  placeholder="Location"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.textInputPhoto}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    fetchSuggestions(text, "photoLocation");
                  }}
                />

                {photoLocationSuggestions.length > 0 && (
                  <FlatList
                    data={photoLocationSuggestions}
                    keyExtractor={(item) => item.id}
                    style={styles.photoDropdown}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setLocation(item.name);
                          setPhotoLocationSuggestions([]);
                        }}
                      >
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>

              <TextInput
                placeholder="Description"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.descriptionPhotoInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <TouchableOpacity
        style={styles.postButton}
        onPress={async () => {
          if (selectedMain === "photo") {
            handlePhotoPost();
            setMessageType("success");
            setMessage("Photo selected. Cloudinary next.");
            setVisible(true);
            setTimeout(() => setVisible(false), 2000);
            return;
          }

          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${BASE_URL}/post`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                from,
                to,
                date,
                seatsAvailable,
                description,
                type: tripType,
              }),
            });

            const data = await response.json();
            const messageText = Array.isArray(data.message)
              ? data.message[0]
              : data.message;

            if (response.ok) {
              setMessageType("success");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 3000);
              setTimeout(() => navigation.replace("BottomNavigator"), 3000);
            } else {
              setMessageType("error");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 2000);
            }
          } catch (e) {
            console.error("POST error:", e);
          }
        }}
      >
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>

      {visible && <SuccessMessageBox text={message} type={messageType} />}
    </View>
  );
};

export default PostScreen;



import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import styles from "../styles/ProfilePassengerView_styles";
import PhotoGrid from "../common/PhotoGrid";
import FullScreenImageViewer from "../common/FullScreenImageViewer";
import Trip from "../common/Trip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import BASE_URL from "../config/api";

const ProfilePassengerView = () => {
  const [activeTab, setActiveTab] = useState("Photos");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [name, setName] = useState("User");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);

  const route = useRoute();
  const passedUserId = route.params?.userId;

  // -------------------------------------
  // LOAD PROFILE (used by refresh + focus)
  // -------------------------------------
  const loadProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const myId = parseInt(await AsyncStorage.getItem("userId"), 10);
      const owner = !passedUserId || passedUserId === myId;
      setIsOwner(owner);

      const finalUserId = owner ? myId : passedUserId;

      const url = owner
        ? `${BASE_URL}/profile/me`
        : `${BASE_URL}/profile/${passedUserId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setName(`${data.first_name} ${data.last_name}`);
      setBio(data.bio || "");
      setCity(data.city || "");
      setInterests(data.interests || "");
      setProfilePhoto(data.profile_photo || null);
      setCoverPhoto(data.cover_photo || null);

      if (owner) {
        await AsyncStorage.setItem("profilePhoto", data.profile_photo || "");
        await AsyncStorage.setItem("coverPhoto", data.cover_photo || "");
      }

      const tripsUrl = owner
        ? `${BASE_URL}/post/my-trips`
        : `${BASE_URL}/post/user/${finalUserId}`;

      const tripsRes = await fetch(tripsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTrips(await tripsRes.json());

      const photosRes = await fetch(`${BASE_URL}/post/photos/${finalUserId}`);
      const photosData = await photosRes.json();
      setPhotos(photosData);
    } catch (err) {
      console.log("❌ Profile load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --------------------
  // FOCUS RE-FETCH FIX
  // --------------------
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [passedUserId])
  );

  // --------------------
  // PULL TO REFRESH FIX
  // --------------------
  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const openImage = (src) => {
    setSelectedImage(src);
    setIsFullScreen(true);
  };

  const closeImage = () => {
    setIsFullScreen(false);
    setSelectedImage(null);
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#051636" }} />;
  }

  const coverSource = coverPhoto
    ? { uri: coverPhoto }
    : require("../assets/profile-picture2.jpeg");

  const profileSource = profilePhoto
    ? { uri: profilePhoto }
    : require("../assets/profile-picture.jpeg");

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerSection}>
              <TouchableOpacity
                style={styles.coverPhoto}
                onPress={() => openImage(coverSource)}
              >
                <Image source={coverSource} style={styles.coverPhotoImage} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profilePicture}
                onPress={() => openImage(profileSource)}
              >
                <Image source={profileSource} style={styles.profileImage} />
              </TouchableOpacity>
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.name}>{name}</Text>

              {isOwner && (
                <TouchableOpacity style={styles.editPenContainer}>
                  <Image
                    source={require("../assets/editPen.png")}
                    resizeMode="contain"
                    style={styles.editPen}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.aboutSection}>
              {city ? (
                <Text style={styles.aboutSectionText}>{city}</Text>
              ) : null}
              {bio ? <Text style={styles.aboutSectionText}>{bio}</Text> : null}
              {interests ? (
                <Text style={styles.aboutSectionText}>{interests}</Text>
              ) : null}
            </View>

            <View style={styles.headerTabsRow}>
              <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setActiveTab("Photos")}>
                  <Text
                    style={[
                      styles.headerText,
                      activeTab === "Photos" && styles.activeTabText,
                    ]}
                  >
                    Photos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab("Trips")}>
                  <Text
                    style={[
                      styles.headerText,
                      activeTab === "Trips" && styles.activeTabText,
                    ]}
                  >
                    Trips
                  </Text>
                </TouchableOpacity>

                {isOwner && (
                  <TouchableOpacity onPress={() => setActiveTab("Myfriends")}>
                    <Text
                      style={[
                        styles.headerText,
                        activeTab === "Myfriends" && styles.activeTabText,
                      ]}
                    >
                      Myfriends
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {activeTab === "Photos" && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <PhotoGrid photos={photos} />
              </View>
            )}

            {activeTab === "Trips" && (
              <FlatList
                data={trips}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => (
                  <Trip
                    from={item.origin}
                    to={item.destination}
                    date={item.trip_date}
                    seatsAvailable={item.available_seats}
                    description={item.description}
                    tripType={item.type}
                    firstName={item.first_name}
                  />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        }
        contentContainerStyle={styles.scrollContent}
      />

      {isFullScreen && selectedImage && (
        <FullScreenImageViewer source={selectedImage} onClose={closeImage} />
      )}
    </View>
  );
};

export default ProfilePassengerView;




// src/socket/index.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

let socket = null;
let readyCallbacks = [];

/**
 * Track which chat the user is currently viewing.
 * null = user is NOT inside a ChatScreen
 */
export let activeChatId = null;
export const setActiveChat = (id) => {
  activeChatId = id;
};

let notifyCallbacks = [];

/**
 * Screens (MessagesScreen, tab badges, etc.) can subscribe
 * to "message arrived for other conversations"
 */
export const onNotify = (cb) => {
  notifyCallbacks.push(cb);
};

export const connectSocket = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (socket && socket.connected) return socket;

    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {}
      socket = null;
    }

    socket = io(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    socket.on("connect", async () => {
      const userId = Number(await AsyncStorage.getItem("userId"));
      if (userId) {
        socket.emit("chat_identify", { userId });
      }

      try {
        readyCallbacks.forEach((cb) => cb());
      } finally {
        readyCallbacks = [];
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("APP SOCKET DISCONNECTED:", reason);
    });

    // -------- NEW: notification handler --------
    socket.on("newMessage", (msg) => {
      // If the message belongs to another conversation → notify
      if (msg.conversationId !== activeChatId) {
        notifyCallbacks.forEach((fn) => fn(msg));
      }
    });

    return socket;
  } catch (e) {
    console.log("[socket] connect error", e);
    throw e;
  }
};

export const getSocket = () => socket;

export const onSocketReady = (callback) => {
  if (socket && socket.connected) {
    callback();
    return;
  }

  readyCallbacks.push(callback);

  if (!socket) {
    connectSocket().catch(() => {});
  }
};

export const subscribe = (event, callback) => {
  if (!socket) return;
  socket.on(event, callback);
};

export const disconnectSocket = () => {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {}
  socket = null;
};



// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingScreen from "./src/screens/LandingScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import CompleteProfileScreen from "./src/screens/CompleteProfileScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BottomNavigator from "./src/common/BottomNavigator";
import ChatTestScreen from "./src/screens/ChatTestScreen";
import ProfilePassengerView from "./src/screens/ProfilePassengerView";
import ChatScreen from "./src/screens/ChatScreen";

import { connectSocket } from "./src/socket";
import { NotificationProvider } from "./src/context/NotificationContext";
import { MessageProvider } from "./src/context/MessageContext"; // 🔥 NEW

const Stack = createNativeStackNavigator();

export default function App() {
  // 🔥 Connect socket ONE TIME here.
  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <NotificationProvider>
        <MessageProvider>
          <NavigationContainer>
            <StatusBar style="light" />

            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen
                name="CompleteProfileScreen"
                component={CompleteProfileScreen}
              />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Profile" component={ProfilePassengerView} />

              <Stack.Screen
                name="BottomNavigator"
                options={{ headerShown: false }}
              >
                {() => (
                  <SafeAreaView
                    style={{ flex: 1, backgroundColor: "#061237" }}
                    edges={[]}
                  >
                    <BottomNavigator />
                  </SafeAreaView>
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </MessageProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },
});




There is some bugs we need to fix them one by one. 
1) The notifications badge is working perfectly fine but there is only one small problem, when I reload the application and log in again, the badge shows the same number. That number is literally the number of notifications that exist in the notifications screen. So even if I open all the notifications and there is no unread notifications, When I reload the app, I see the badge again even though there is no actual new notifications. 
2) inside the notifications screen, The "send message" button does not exists like it used to in previous design. Look at the other screenshot. 
3) inside the notifications screen when I click the profile picture on the travel card, instead of opening the profile of that person(the profile photo owner) it openes my own profile instead. 

RULES: 
1) ALWAYS, ALWAYS, ALWAYS PROVIDE FULL FILE. I don't care about your explanations, If there is a file that need changes, provide that full file with the new changes. don't show me the snippet that needs to be changed and then ask me if I need full file. ALWAYS PROVIDE FILE FROM THE BEGINNING. DON'T MAKE ME REPEAT THIS INSTRUCTION OVER AND OVER AGAIN 
2) keep your answers short and very minimal. ALWAYS KEEP THEM SHORT ALWAYS ALWAYS. DON'T MAKE ME REPEAT THIS INSTRUCTION OVER AND OVER AGAIN 
3) don't fuck up my code or my app. If there is a file you don't have or need ask me. I'll upload it. If you're not sure about something ask. 
4) If there is debugging steps, say them one by one. Say the first one and wait till I paste the output. Let's start with fixing the first problem. Again if you need other information let me know. Like database tables or anything else. If you're going to modify a file and you need the current file let me know. 