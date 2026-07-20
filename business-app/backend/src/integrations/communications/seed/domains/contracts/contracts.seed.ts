import type { CatalogDomain } from '../../../catalog/communication-catalog.types';

/**
 * Contracts domain — platform events for contract lifecycle actions.
 * All events delivered via Platform credentials (COMMUNICATION_API_KEY).
 * These are internal ERP notifications — NOT communications to customers.
 */
export const CONTRACTS_SEED_DOMAIN: CatalogDomain = {
  domainKey: 'contracts',
  displayName: 'Contracts',
  domainCategory: 'system_notifications',
  isSystem: true,
  version: 1,
  events: [
    {
      eventKey: 'contract_created',
      displayName: 'Contract Created',
      description: 'Notify the actor when a new contract is created.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Contract created — {{data.positionName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  A new contract has been created for <strong>{{data.customerName}}</strong> at <strong>{{data.businessName}}</strong>.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Position</td>
    <td style="padding: 4px 0;"><strong>{{data.positionName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Status</td>
    <td style="padding: 4px 0;">{{data.contractStatus}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Created</td>
    <td style="padding: 4px 0;">{{data.actionDate}}</td>
  </tr>
</table>`,
          requiredVariables: ['data.firstName', 'data.businessName', 'data.customerName', 'data.positionName', 'data.contractStatus', 'data.actionDate'],
          optionalVariables: ['data.contractUrl', 'data.startDate', 'data.endDate'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'contract_updated',
      displayName: 'Contract Updated',
      description: 'Notify the actor when a contract is updated.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Contract updated — {{data.positionName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The contract for <strong>{{data.customerName}}</strong> (<strong>{{data.positionName}}</strong>) has been updated.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Updated on {{data.actionDate}}.</p>`,
          requiredVariables: ['data.firstName', 'data.businessName', 'data.customerName', 'data.positionName', 'data.contractStatus', 'data.actionDate'],
          optionalVariables: ['data.contractUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'contract_activated',
      displayName: 'Contract Activated',
      description: 'Notify the actor when a contract is activated.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Contract activated — {{data.positionName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The contract for <strong>{{data.customerName}}</strong> (<strong>{{data.positionName}}</strong>) is now <strong>active</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Activated on {{data.actionDate}}.</p>`,
          requiredVariables: ['data.firstName', 'data.businessName', 'data.customerName', 'data.positionName', 'data.contractStatus', 'data.actionDate'],
          optionalVariables: ['data.contractUrl', 'data.startDate', 'data.endDate'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'contract_cancelled',
      displayName: 'Contract Cancelled',
      description: 'Notify the actor when a contract is cancelled.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Contract cancelled — {{data.positionName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The contract for <strong>{{data.customerName}}</strong> (<strong>{{data.positionName}}</strong>) has been <strong>cancelled</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Cancelled on {{data.actionDate}}.</p>`,
          requiredVariables: ['data.firstName', 'data.businessName', 'data.customerName', 'data.positionName', 'data.contractStatus', 'data.actionDate'],
          optionalVariables: ['data.contractUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'contract_finished',
      displayName: 'Contract Finished',
      description: 'Notify the actor when a contract is marked as finished.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Contract finished — {{data.positionName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The contract for <strong>{{data.customerName}}</strong> (<strong>{{data.positionName}}</strong>) has been marked as <strong>finished</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Finished on {{data.actionDate}}.</p>`,
          requiredVariables: ['data.firstName', 'data.businessName', 'data.customerName', 'data.positionName', 'data.contractStatus', 'data.actionDate'],
          optionalVariables: ['data.contractUrl', 'data.endDate'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
  ],
};
