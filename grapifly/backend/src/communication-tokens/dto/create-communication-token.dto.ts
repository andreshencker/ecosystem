export interface CreateCommunicationTokenDto {
  name: string;
  description?: string;
  expiresAt?: string | null;
}
