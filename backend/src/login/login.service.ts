import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateLoginDto } from './dto/create-login.dto';
import type { Pool } from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import { generateToken } from 'src/utils/jwt.utils';

@Injectable()
export class LoginService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async create(createLoginDto: CreateLoginDto) {
    const { email, password } = createLoginDto;

    const [rows] = await this.db.query<any[]>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('User does not exist');
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }

  findAll() {
    return `This action returns all login`;
  }

  findOne(id: number) {
    return `This action returns a #${id} login`;
  }

  update(id: number) {
    return `This action updates a #${id} login`;
  }

  remove(id: number) {
    return `This action removes a #${id} login`;
  }
}
