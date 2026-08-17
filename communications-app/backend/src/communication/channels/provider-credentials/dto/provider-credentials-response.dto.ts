export class ProviderCredentialsResponseDto {
  id!: string;

  // SIEMPRE string (clave para Domain)
  companyChannelProviderId!: string;
  grapiflyOrganizationId!: string | null;

  tag!: string;
  isActive!: boolean;

  /** Non-secret display value. Undefined for records predating this field. */
  displayIdentifier?: string;

  /** OAuth providers only — which auth-mode tab this was saved from. */
  oauthAppSource?: 'ecosystem' | 'own' | null;

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
