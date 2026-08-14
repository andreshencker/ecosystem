import type { ChannelKey, ContractSpec } from './credentials.types';
import { CredentialsContractError } from './credentials.errors';

import { SmtpCredentialsContract } from '../email/smtp/smtp-credentials.contract';
import { S3AccessKeysCredentialsContract } from '../storage/access_keys/s3-credentials.contract';

/**
 * Aquí vas agregando más contracts (oauth, api_key, iam_role, etc)
 * sin tocar la lógica de guardado.
 */
const CONTRACTS: ContractSpec<any>[] = [
  SmtpCredentialsContract,
  S3AccessKeysCredentialsContract,
];

export function getCredentialsContract(params: {
  channelKey: ChannelKey;
  connectionType: string;
}): ContractSpec<any> {
  const ck = String(params.channelKey).toLowerCase().trim() as ChannelKey;
  const ct = String(params.connectionType).toLowerCase().trim();

  const found = CONTRACTS.find(
    (c) => c.channelKey === ck && String(c.connectionType).toLowerCase() === ct,
  );

  if (!found) {
    throw new CredentialsContractError(
      `No credentials contract for channel="${ck}" connectionType="${ct}"`,
    );
  }
  return found;
}
