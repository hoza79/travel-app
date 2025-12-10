import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { CreatePostDto } from './dto/create-post.dto';
import { getCoordinates } from 'src/utils/geocoding.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class PostService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly notificationsGateway: NotificationsGateway,
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

  // ---------------------------------------------------------------------
  // ⭐ DELETE TRIP
  // ---------------------------------------------------------------------
  async delete(tripId: number, userId: number) {
    try {
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

      await this.db.query('DELETE FROM notifications WHERE trip_id = ?', [
        tripId,
      ]);

      await this.db.query('DELETE FROM interest_requests WHERE trip_id = ?', [
        tripId,
      ]);

      await this.db.query('DELETE FROM trips WHERE id = ?', [tripId]);

      this.notificationsGateway.sendTripDeleted(tripId);

      return { message: 'Trip deleted successfully' };
    } catch (error) {
      console.error('❌ Database Error (delete):', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------
  // ⭐ CREATE PHOTO
  // ---------------------------------------------------------------------
  async createPhoto(createPhotoDto: CreatePhotoDto, userId: number) {
    const { photo_url, location, description } = createPhotoDto;

    try {
      if (!location || location.trim().length === 0) {
        throw new BadRequestException('Location is required');
      }

      const coords = await getCoordinates(location);

      if (!coords?.lat || !coords?.lng) {
        throw new BadRequestException('Invalid location');
      }

      await this.db.query(
        `INSERT INTO photos 
          (user_id, photo_url, location, description, photo_lat, photo_lng)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, photo_url, location, description, coords.lat, coords.lng],
      );

      return { message: 'Photo post created successfully' };
    } catch (error) {
      console.error('❌ Database Error (createPhoto):', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------
  // ⭐ GET ALL PHOTOS
  // ---------------------------------------------------------------------
  async getAllPhotos(userLat?: number, userLng?: number) {
    try {
      if (!userLat || !userLng) {
        const [rows]: any = await this.db.query(
          `SELECT 
            photos.id,
            photos.user_id,
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
            photos.user_id,
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

  // ---------------------------------------------------------------------
  // ⭐ GET PHOTOS BY USER
  // ---------------------------------------------------------------------
  async getPhotosByUser(userId: number) {
    try {
      const [data] = await this.db.query(
        `SELECT 
           id,
           user_id,
           photo_url,
           location,
           description,
           created_at
         FROM photos 
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId],
      );
      return data;
    } catch (error) {
      console.error('❌ Database Error (getPhotosByUser):', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------
  // ⭐ DELETE PHOTO — NOW BROADCASTS REALTIME
  // ---------------------------------------------------------------------
  async deletePhoto(photoId: number, userId: number) {
    try {
      const [rows]: any = await this.db.query(
        `SELECT user_id FROM photos WHERE id = ? LIMIT 1`,
        [photoId],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Photo not found');
      }

      if (rows[0].user_id !== userId) {
        throw new ForbiddenException('You cannot delete this photo');
      }

      await this.db.query(`DELETE FROM photos WHERE id = ?`, [photoId]);

      // ⭐ NEW: broadcast deletion
      this.notificationsGateway.sendPhotoDeleted(photoId);

      return { message: 'Photo deleted successfully' };
    } catch (error) {
      console.error('❌ Database Error (deletePhoto):', error);
      throw error;
    }
  }
}
