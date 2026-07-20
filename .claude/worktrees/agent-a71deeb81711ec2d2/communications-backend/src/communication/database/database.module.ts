import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        // Explicit database name — overrides whatever is in the URI.
        // All platform data lives in communication_platform_db.
        dbName: 'communication_platform_db',
        autoIndex: true,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
