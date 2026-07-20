import { Module } from '@nestjs/common';
import { CommunicationCatalogProvisioningService } from './communication-catalog-provisioning.service';

@Module({
  providers: [CommunicationCatalogProvisioningService],
  exports: [CommunicationCatalogProvisioningService],
})
export class CommunicationCatalogProvisioningModule {}
