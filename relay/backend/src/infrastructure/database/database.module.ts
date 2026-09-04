import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        // Prod leaves MONGODB_DB_NAME unset → 'relaydb'. Local dev sets it
        // (e.g. 'relaydb_dev') so it never shares a database with production,
        // even when both point at the same Atlas cluster.
        dbName: config.get<string>('MONGODB_DB_NAME') ?? 'relaydb',
        autoIndex: true,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
