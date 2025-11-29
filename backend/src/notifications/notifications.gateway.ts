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
      // Try to extract token from handshake headers first (if provided)
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
            // Ack back so client knows mapping succeeded
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
}
