import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';
import type { Pool } from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import { generateToken } from 'src/utils/jwt.utils';

@Injectable()
export class RegisterService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async create(createRegisterDto: CreateRegisterDto) {
    const { first_name, last_name, email, password } = createRegisterDto;
    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);

    try {
      const [result]: any = await this.db.query(
        'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
        [first_name, last_name, email, hashedPassword],
      );

      const token = generateToken({
        id: result.insertId,
        email,
        first_name,
        last_name,
      });

      return {
        message: 'User registered successfully.',
        token,
        user: {
          id: result.insertId,
          email,
          first_name,
          last_name,
        },
      };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
        throw new ConflictException('User already exists');
      }

      console.error('❌ Database Error:', error);
      throw error;
    }
  }

  findAll() {
    return `This action returns all register`;
  }

  findOne(id: number) {
    return `This action returns a #${id} register`;
  }

  update(id: number, updateRegisterDto: UpdateRegisterDto) {
    return `This action updates a #${id} register`;
  }

  remove(id: number) {
    return `This action removes a #${id} register`;
  }
}
