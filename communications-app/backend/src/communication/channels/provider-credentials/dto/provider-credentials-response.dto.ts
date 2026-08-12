export class ProviderCredentialsResponseDto {
  id!: string;

  // SIEMPRE string (clave para Domain)
  companyChannelProviderId!: string;
  grapiflyOrganizationId!: string | null;

  tag!: string;
  isActive!: boolean;

  /** Non-secret display value. Undefined for records predating this field. */
  displayIdentifier?: string;

  createdAt!: string;
  updatedAt!: string;

  // SOLO cuando populate=true
  companyChannelProvider?: {
    id: string;
    companyId: string;
    grapiflyOrganizationId: string | null;
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
