export type ChannelToUseResponseDto = {
  channel: 'email' | 'sms';
  providerCredentialsId: string;
};

export class DomainCatalogueResponseDto {
  id!: string;

  companyId!: string;
  domainKey!: string;
  displayName!: string;
  domainCategory!: string;

  isActive!: boolean;

  channelsToUse!: ChannelToUseResponseDto[];

  createdAt!: string;
  updatedAt!: string;
}
