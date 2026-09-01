import { SetMetadata } from '@nestjs/common';

export type EcosystemFlow = 'client' | 'provider' | 'internal';
export const FLOWS_KEY = 'ecosystem_flows';
export const Flows = (...flows: EcosystemFlow[]) => SetMetadata(FLOWS_KEY, flows);
