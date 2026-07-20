import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import {
  IntegrationConnection,
  IntegrationConnectionSchema,
} from './connection/communication-connection.schema';
import { CommunicationConnectionService } from './connection/communication-connection.service';
import { CommunicationConnectionController } from './connection/communication-connection.controller';
import { CommunicationsClientService } from './client/communications-client.service';
import { CommunicationCatalogProvisioningService } from './provisioning/communication-catalog-provisioning.service';
import { SecurityModule } from '../../infrastructure/common/security/security.module';
import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import {
  Business,
  BusinessSchema,
} from '../../modules/business/schemas/business.schema';

/**
 * CommunicationsModule — Integration with Communications App.
 *
 * On startup, provisions Platform Events to Communications App idempotently.
 * Business Events are provisioned when a Business saves its integration token.
 */
@Module({
  imports: [
    HttpModule,
    SecurityModule,
    MongooseModule.forFeature([
      { name: IntegrationConnection.name, schema: IntegrationConnectionSchema },
      { name: User.name, schema: UserSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  controllers: [CommunicationConnectionController],
  providers: [
    CommunicationConnectionService,
    CommunicationsClientService,
    CommunicationCatalogProvisioningService,
  ],
  exports: [
    CommunicationConnectionService,
    CommunicationsClientService,
    CommunicationCatalogProvisioningService,
  ],
})
export class CommunicationsModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(CommunicationsModule.name);

  constructor(
    private readonly provisioning: CommunicationCatalogProvisioningService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Runs after all modules are initialized, before the HTTP server opens.
   * 1. Drops the stale non-sparse unique index that blocks new connection creation.
   * 2. Provisions platform event catalog (fire-and-forget).
   */
  onApplicationBootstrap(): void {
    this.dropStaleCompanyProviderIndex()
      .then(() => this.provisioning.provisionPlatformCatalog())
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          '[onApplicationBootstrap] Startup sequence failed unexpectedly: ' + msg,
        );
      });
  }

  /**
   * Drops the legacy non-sparse `uniq_company_provider` index if it still exists.
   *
   * WHY: The original schema had a unique non-sparse index on { companyId, provider }.
   * This causes a duplicate-key error when inserting two documents that both lack a
   * companyId field (both are treated as null by MongoDB). The replacement index
   * (legacy_uniq_company_provider) is sparse, so it only indexes documents that
   * actually have a companyId value. Idempotent: no-ops if the index is already gone.
   */
  private async dropStaleCompanyProviderIndex(): Promise<void> {
    try {
      const col = this.connection.db!.collection('integration_connections');
      const indexes = await col.indexes();
      const stale = indexes.find(
        (i) => i.name === 'uniq_company_provider' && !i.sparse,
      );
      if (stale) {
        await col.dropIndex('uniq_company_provider');
        this.logger.log(
          '[startup] Dropped stale non-sparse index uniq_company_provider on integration_connections.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[startup] Could not drop stale index (non-fatal): ${msg}`);
    }
  }
}
