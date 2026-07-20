export class ProviderCredentialsResponseDto {
  id!: string;

  // SIEMPRE string (clave para Domain)
  companyChannelProviderId!: string;

  tag!: string;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;

  // SOLO cuando populate=true
  companyChannelProvider?: {
    id: string;
    companyId: string;
    isActive: boolean;

    provider?: {
      id: string;
      providerKey: string;
      connectionType: string;
      displayName?: string;
    };

    channel?: {
      id: string;
      channelKey: string;
      displayName?: string;
    };
  };
}
