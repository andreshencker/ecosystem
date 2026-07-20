/**
 * Default events for the 'notifications' domain (displayName: 'System Notifications').
 *
 * Provisioned ONLY on the Platform Company (isPlatformCompany: true).
 *
 * Unlike the 'security' domain (authentication / invitation flows), the
 * 'notifications' domain covers operational lifecycle events — token management,
 * system alerts, etc. — that must also be sent via Platform Company credentials.
 *
 *   scope       = 'modules'   — belong to the modules catalogue
 *   senderScope = 'modules'   — always delivered via Grapifly credentials
 *   eventType   = 'notification'
 */

export interface DefaultNotificationsEventDefinition {
  eventKey: string;
  displayName: string;
  description: string;
  eventType: 'notification';
  scope: 'platform';
  senderScope: 'platform';
  channelContent: {
    email: {
      enabled: boolean;
      subject: string;
      content: string;
      requiredVariables: string[];
      optionalVariables: string[];
    };
  };
}

export const DEFAULT_NOTIFICATIONS_EVENTS: DefaultNotificationsEventDefinition[] = [

  // ── Integration Token lifecycle ──────────────────────────────────────────────

  {
    eventKey: 'integration_token_created',
    displayName: 'Integration Token Created',
    description: 'Notify the company owner when a new integration token is created for an external application.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'New integration token created — {{data.integrationName}}',
        content: `<p style="margin: 0 0 16px;">A new integration token has been created for <strong>{{data.companyName}}</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Integration</td>
    <td style="padding: 4px 0;"><strong>{{data.integrationName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Environment</td>
    <td style="padding: 4px 0;">{{data.environment}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Created by</td>
    <td style="padding: 4px 0;">{{data.createdBy}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Created at</td>
    <td style="padding: 4px 0;">{{data.createdAt}}</td>
  </tr>
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not authorise this action, contact your administrator immediately.
</p>`,
        requiredVariables: ['data.companyName', 'data.integrationName', 'data.environment', 'data.createdBy', 'data.createdAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'integration_token_rotated',
    displayName: 'Integration Token Rotated',
    description: 'Notify the company owner when an integration token is rotated. The previous token is immediately invalidated.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Integration token rotated — {{data.integrationName}}',
        content: `<p style="margin: 0 0 16px;">The integration token for <strong>{{data.integrationName}}</strong> at <strong>{{data.companyName}}</strong> has been rotated.</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  The previous token has been <strong>immediately invalidated</strong>. External systems using the old token will lose access until updated.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Integration</td>
    <td style="padding: 4px 0;"><strong>{{data.integrationName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Environment</td>
    <td style="padding: 4px 0;">{{data.environment}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Rotated by</td>
    <td style="padding: 4px 0;">{{data.rotatedBy}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Rotated at</td>
    <td style="padding: 4px 0;">{{data.rotatedAt}}</td>
  </tr>
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not authorise this rotation, contact your administrator immediately.
</p>`,
        requiredVariables: ['data.companyName', 'data.integrationName', 'data.environment', 'data.rotatedBy', 'data.rotatedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'integration_token_revoked',
    displayName: 'Integration Token Revoked',
    description: 'Notify the company owner when an integration token is permanently revoked or deleted.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Integration token revoked — {{data.integrationName}}',
        content: `<p style="margin: 0 0 16px;">The integration token for <strong>{{data.integrationName}}</strong> at <strong>{{data.companyName}}</strong> has been permanently revoked.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Integration</td>
    <td style="padding: 4px 0;"><strong>{{data.integrationName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Environment</td>
    <td style="padding: 4px 0;">{{data.environment}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Revoked by</td>
    <td style="padding: 4px 0;">{{data.revokedBy}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Revoked at</td>
    <td style="padding: 4px 0;">{{data.revokedAt}}</td>
  </tr>
  {{#data.reason}}
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Reason</td>
    <td style="padding: 4px 0;">{{data.reason}}</td>
  </tr>
  {{/data.reason}}
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  External systems using this token no longer have access. A new integration must be created if connectivity is required.
</p>`,
        requiredVariables: ['data.companyName', 'data.integrationName', 'data.environment', 'data.revokedBy', 'data.revokedAt'],
        optionalVariables: ['data.reason'],
      },
    },
  },

  // ── Provider Credential lifecycle ───────────────────────────────────────────

  {
    eventKey: 'provider_credential_created',
    displayName: 'Provider Credential Created',
    description: 'Notify the company owner when a new provider credential is added to a channel.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'New credential added — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">A new credential has been added to your account at <strong>{{data.companyName}}</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Connection type</td><td style="padding: 4px 0;">{{data.connectionType}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Added by</td><td style="padding: 4px 0;">{{data.createdBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Added at</td><td style="padding: 4px 0;">{{data.createdAt}}</td></tr>
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not authorise this change, contact your platform administrator immediately.
</p>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.connectionType','data.createdBy','data.createdAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'provider_credential_updated',
    displayName: 'Provider Credential Updated',
    description: 'Notify the company owner when a provider credential is modified.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Credential updated — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">A credential at <strong>{{data.companyName}}</strong> has been updated.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Updated by</td><td style="padding: 4px 0;">{{data.updatedBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Updated at</td><td style="padding: 4px 0;">{{data.updatedAt}}</td></tr>
</table>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.connectionType','data.updatedBy','data.updatedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'provider_credential_activated',
    displayName: 'Provider Credential Activated',
    description: 'Notify the company owner when a provider credential is re-activated.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Credential activated — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">The following credential at <strong>{{data.companyName}}</strong> has been <strong>activated</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Activated by</td><td style="padding: 4px 0;">{{data.activatedBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Activated at</td><td style="padding: 4px 0;">{{data.activatedAt}}</td></tr>
</table>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.activatedBy','data.activatedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'provider_credential_deactivated',
    displayName: 'Provider Credential Deactivated',
    description: 'Notify the company owner when a provider credential is deactivated.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Credential deactivated — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">The following credential at <strong>{{data.companyName}}</strong> has been <strong>deactivated</strong>. Notifications using this credential will stop being delivered.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Deactivated by</td><td style="padding: 4px 0;">{{data.deactivatedBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Deactivated at</td><td style="padding: 4px 0;">{{data.deactivatedAt}}</td></tr>
</table>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.deactivatedBy','data.deactivatedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'provider_credential_deleted',
    displayName: 'Provider Credential Deleted',
    description: 'Notify the company owner when a provider credential is permanently deleted.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Credential deleted — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">A credential at <strong>{{data.companyName}}</strong> has been <strong>permanently deleted</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Deleted by</td><td style="padding: 4px 0;">{{data.deletedBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Deleted at</td><td style="padding: 4px 0;">{{data.deletedAt}}</td></tr>
</table>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.deletedBy','data.deletedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'provider_credential_verified',
    displayName: 'Provider Credential Verified',
    description: 'Notify the company owner when a credential connection test passes successfully.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Credential verified ✓ — {{data.providerName}} ({{data.channel}})',
        content: `<p style="margin: 0 0 16px;">The following credential at <strong>{{data.companyName}}</strong> was verified successfully.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td><td style="padding: 4px 0;"><strong>{{data.providerName}}</strong></td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Channel</td><td style="padding: 4px 0;">{{data.channel}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Tag</td><td style="padding: 4px 0; font-family: monospace;">{{data.credentialTag}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Verified by</td><td style="padding: 4px 0;">{{data.verifiedBy}}</td></tr>
  <tr><td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Verified at</td><td style="padding: 4px 0;">{{data.verifiedAt}}</td></tr>
</table>`,
        requiredVariables: ['data.companyName','data.credentialTag','data.providerName','data.channel','data.verifiedBy','data.verifiedAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'integration_token_expired',
    displayName: 'Integration Token Expired',
    description: 'Notify the company owner when an integration token reaches its configured expiry date and is no longer valid.',
    eventType: 'notification',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Integration token expired — {{data.integrationName}}',
        content: `<p style="margin: 0 0 16px;">The integration token for <strong>{{data.integrationName}}</strong> at <strong>{{data.companyName}}</strong> has expired.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Integration</td>
    <td style="padding: 4px 0;"><strong>{{data.integrationName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Environment</td>
    <td style="padding: 4px 0;">{{data.environment}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Expired at</td>
    <td style="padding: 4px 0;">{{data.expiredAt}}</td>
  </tr>
</table>
<p style="margin: 0 0 16px;">
  External systems using this token can no longer authenticate. Log in to the portal and rotate or replace the integration token to restore connectivity.
</p>`,
        requiredVariables: ['data.companyName', 'data.integrationName', 'data.environment', 'data.expiredAt'],
        optionalVariables: [],
      },
    },
  },
];
