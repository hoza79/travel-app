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

  private clients = new Map<number, Set<string>>();

  afterInit() {
    this.logger.log('NotificationsGateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      let tokenUserId: number | null = null;
      try {
        tokenUserId = verifySocketToken(client);
      } catch {
        tokenUserId = null;
      }

      this.logger.log(
        `Client connected: ${client.id} (handshakeUid=${tokenUserId})`,
      );

      if (tokenUserId) {
        this.addClientMapping(tokenUserId, client.id);
      }

      client.on('identify', (data) => {
        const uid = Number(data?.userId);
        if (!Number.isNaN(uid) && uid > 0) {
          this.addClientMapping(uid, client.id);
          client.emit('identify_ack', { success: true, userId: uid });
        } else {
          client.emit('identify_ack', { success: false });
        }
      });

      client.on('disconnecting', () => {
        this.removeSocketFromAllMappings(client.id);
      });

      client.on('disconnect', () => {
        this.removeSocketFromAllMappings(client.id);
      });
    } catch {
      try {
        client.disconnect(true);
      } catch {}
    }
  }

  handleDisconnect(client: Socket) {
    this.removeSocketFromAllMappings(client.id);
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
        if (socketSet.size === 0) this.clients.delete(userId);
        return;
      }
    }
  }

  sendNotification(userId: number, payload: any) {
    const socketSet = this.clients.get(userId);
    if (!socketSet) return;

    for (const socketId of socketSet) {
      this.server.to(socketId).emit('new_notification', payload);
    }
  }

  sendDeletion(userId: number, interestRequestId: number) {
    const socketSet = this.clients.get(userId);
    if (!socketSet) return;

    for (const socketId of socketSet) {
      this.server.to(socketId).emit('notification_deleted', {
        interestRequestId,
      });
    }
  }

  // ⭐ Trip deleted broadcast
  sendTripDeleted(tripId: number) {
    this.server.emit('trip_deleted', { tripId });
  }

  // ⭐ PHOTO deleted broadcast — NEW
  sendPhotoDeleted(photoId: number) {
    this.server.emit('photo_deleted', { photoId });
  }
}
