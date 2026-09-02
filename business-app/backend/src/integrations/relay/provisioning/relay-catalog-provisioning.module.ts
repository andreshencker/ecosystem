import { Module } from '@nestjs/common';
import { RelayCatalogProvisioningService } from './relay-catalog-provisioning.service';

@Module({
  providers: [RelayCatalogProvisioningService],
  exports: [RelayCatalogProvisioningService],
})
export class RelayCatalogProvisioningModule {}
