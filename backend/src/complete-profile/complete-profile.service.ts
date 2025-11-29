import { Inject, Injectable } from '@nestjs/common';
import { CreateCompleteProfileDto } from './dto/create-complete-profile.dto';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class CompleteProfileService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async completeProfile(userId: number, dto: CreateCompleteProfileDto) {
    const { bio, city, interests, age, profile_photo, cover_photo } = dto;

    try {
      await this.db.query(
        `UPDATE users
         SET bio = ?, city = ?, interests = ?, age = ?, profile_photo = ?, cover_photo = ?
         WHERE id = ?`,
        [bio, city, interests, age, profile_photo, cover_photo, userId],
      );

      return { message: 'Profile completed successfully.' };
    } catch (error) {
      console.error('❌ Database Error (completeProfile):', error);
      throw error;
    }
  }
}
