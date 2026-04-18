import { createPool } from 'mysql2/promise';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const databaseProviders: Provider[] = [
  {
    provide: 'DATABASE_CONNECTION',
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const pool = createPool({
        host: configService.get<string>('DB_HOST'),
        user: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        port: Number(configService.get<string>('DB_PORT')) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      return pool;
    },
  },
];
