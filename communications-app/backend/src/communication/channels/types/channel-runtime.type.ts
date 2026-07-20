export type ChannelKey = 'email' | 'sms' | 'storage';

export type ConnectionType = 'smtp' | 'api_key' | 'access_keys' | string;

export type ChannelRuntime = {
  channelKey: ChannelKey; // email | sms | storage
  providerKey: string; // gmail | twilio | aws | ...
  connectionType: ConnectionType; // smtp | api_key | access_keys
  providerCredentialsId: string;
  companyChannelProviderId: string;
  credentialsIsActive: boolean;
  tag?: string;
};
