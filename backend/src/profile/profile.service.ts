import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class ProfileService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  /**
   * Returns user profile by user id.
   * Selected fields: id, first_name, last_name, bio, city, interests,
   * age, profile_photo, cover_photo
   */
  async getProfileByUserId(userId: number) {
    if (!userId || isNaN(userId)) {
      throw new NotFoundException('User not found');
    }

    try {
      const [rows]: any = await this.db.query(
        `SELECT id, first_name, last_name, bio, city, interests, age, profile_photo, cover_photo
         FROM users
         WHERE id = ? LIMIT 1`,
        [userId],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const r = rows[0];

      return {
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        bio: r.bio || null,
        city: r.city || null,
        interests: r.interests || null,
        age: r.age === null ? null : Number(r.age),
        profile_photo: r.profile_photo || null,
        cover_photo: r.cover_photo || null,
      };
    } catch (error) {
      console.error('❌ Database Error (getProfileByUserId):', error);
      throw error;
    }
  }
}
