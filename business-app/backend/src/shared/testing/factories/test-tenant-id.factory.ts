import { TenantId } from '../../domain/value-objects/tenant-id.vo';

export function createTenantId(value?: string): TenantId {
  return value ? TenantId.from(value) : TenantId.generate();
}
