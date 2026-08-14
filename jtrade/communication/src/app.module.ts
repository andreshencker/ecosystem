// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompanyModule } from './company/company-info/company.module';

import { NotificationModule } from './notifications/notification.module';
import { CompanyThemeModule } from './company/company-theme/company-theme.module';
import { FilesModule } from './files/files.module';
import { PreviewModule } from './preview/preview.module';
import { ChannelsCatalogModule } from './channels/channels-catalogue/channels-catalog.module';
import { DomainCatalogueModule } from './notifications/events/domain-catalogue/domain-catalogue.module';
import { ProviderCredentialsModule } from './channels/provider-credentials/provider-credentials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local', // override para local
        '.env.prod', // entorno producción
        '.env', // fallback general
      ],
    }),

    CompanyModule,
    CompanyThemeModule,
    ChannelsCatalogModule,
    DatabaseModule,
    NotificationModule,
    DomainCatalogueModule,
    FilesModule,
    PreviewModule,

    ProviderCredentialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
