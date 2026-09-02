import { getCredentialsContract } from './credentials.registry';
import { CredentialsVerificationError } from './credentials.errors';

export async function normalizeValidateAndVerify(params: {
  channelKey: 'email' | 'sms' | 'storage';
  connectionType: string;
  credentials: Record<string, any>;
  verify?: boolean;
}) {
  const contract = getCredentialsContract({
    channelKey: params.channelKey,
    connectionType: params.connectionType,
  });

  const normalized = contract.normalize(params.credentials);
  contract.validate(normalized.value);

  if (params.verify && contract.verify) {
    const vr = await contract.verify(normalized.value);
    if (!vr.ok) {
      throw new CredentialsVerificationError(
        vr.message ?? 'Credentials verification failed',
        vr.details,
      );
    }
  }

  return {
    cleanedCredentials: normalized.value,
    warnings: normalized.warnings ?? [],
  };
}
