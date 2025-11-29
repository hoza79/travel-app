import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';

export function generateToken(payload: object): string {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) throw new Error('JWT secret key not configured');

  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

export function verifyToken(req): number {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new UnauthorizedException('Missing token');

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET_KEY as string;
    if (!secret) throw new Error('JWT secret key not configured');
    const decoded: any = jwt.verify(token, secret);
    return decoded.id;
  } catch (err) {
    throw new UnauthorizedException('Invalid or expired token');
  }
}

export function verifySocketToken(client: any): number | null {
  try {
    const authHeader = client.handshake.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const secret = process.env.JWT_SECRET_KEY as string;
    if (!secret) return null;

    const decoded: any = jwt.verify(token, secret);
    return decoded.id;
  } catch {
    return null;
  }
}
