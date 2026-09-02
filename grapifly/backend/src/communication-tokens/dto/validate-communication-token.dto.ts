export interface ValidateCommunicationTokenDto {
  token: string;
}

export interface ValidateCommunicationTokenResponseDto {
  organizationId: string;
  organizationName: string;
  tokenId: string;
}
