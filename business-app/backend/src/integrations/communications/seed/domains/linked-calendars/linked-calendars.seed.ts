import type { CatalogDomain } from '../../../catalog/communication-catalog.types';

/**
 * linked_calendars domain — platform events for linked calendar lifecycle.
 * All events use Platform credentials (COMMUNICATION_API_KEY / platform connection).
 * These are internal ERP configuration notifications, NOT business-to-customer emails.
 */
export const LINKED_CALENDARS_SEED_DOMAIN: CatalogDomain = {
  domainKey:      'linked_calendars',
  displayName:    'Linked Calendars',
  domainCategory: 'system_notifications',
  isSystem:       true,
  version:        1,
  events: [
    // ── calendar_linked ───────────────────────────────────────────────────────
    {
      eventKey:    'calendar_linked',
      displayName: 'Calendar Linked',
      description: 'Sent when a calendar is linked to the Business.',
      eventType:   'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar linked to {{data.businessName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar <strong>{{data.calendarName}}</strong> from <strong>{{data.accountIdentifier}}</strong>
  ({{data.providerName}}) has been linked to <strong>{{data.businessName}}</strong>.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Calendar</td>
    <td style="padding: 4px 0;"><strong>{{data.calendarName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Account</td>
    <td style="padding: 4px 0;">{{data.accountIdentifier}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Provider</td>
    <td style="padding: 4px 0;">{{data.providerName}}</td>
  </tr>
  {{#data.timezone}}
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Timezone</td>
    <td style="padding: 4px 0;">{{data.timezone}}</td>
  </tr>
  {{/data.timezone}}
  {{#data.accessRole}}
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Access</td>
    <td style="padding: 4px 0;">{{data.accessRole}}</td>
  </tr>
  {{/data.accessRole}}
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Linked on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.accountIdentifier',
            'data.providerName',
            'data.calendarName',
            'data.actionDate',
          ],
          optionalVariables: [
            'data.calendarDescription',
            'data.timezone',
            'data.accessRole',
            'data.linkedCalendarsUrl',
          ],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },

    // ── calendars_bulk_linked ────────────────────────────────────────────────
    {
      eventKey:    'calendars_bulk_linked',
      displayName: 'Calendars Bulk Linked',
      description: 'Sent when multiple calendars are linked at once.',
      eventType:   'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendars linked to {{data.businessName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  <strong>{{data.calendarCount}} calendars</strong> from <strong>{{data.accountIdentifier}}</strong>
  ({{data.providerName}}) have been linked to <strong>{{data.businessName}}</strong>.
</p>
<p style="margin: 0 0 8px; color: {{theme.mutedTextColor}};">Calendars linked:</p>
<p style="margin: 0 0 16px;"><strong>{{data.calendarNames}}</strong></p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Linked on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.accountIdentifier',
            'data.providerName',
            'data.calendarCount',
            'data.calendarNames',
            'data.actionDate',
          ],
          optionalVariables: ['data.linkedCalendarsUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },

    // ── calendar_activated ────────────────────────────────────────────────────
    {
      eventKey:    'calendar_activated',
      displayName: 'Calendar Activated',
      description: 'Sent when a linked calendar is reactivated.',
      eventType:   'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar activated — {{data.calendarName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar <strong>{{data.calendarName}}</strong> ({{data.accountIdentifier}}) has been
  <strong>activated</strong> for <strong>{{data.businessName}}</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Activated on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.accountIdentifier',
            'data.providerName',
            'data.calendarName',
            'data.actionDate',
          ],
          optionalVariables: ['data.linkedCalendarsUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },

    // ── calendar_paused ───────────────────────────────────────────────────────
    {
      eventKey:    'calendar_paused',
      displayName: 'Calendar Paused',
      description: 'Sent when a linked calendar is paused.',
      eventType:   'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar paused — {{data.calendarName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar <strong>{{data.calendarName}}</strong> ({{data.accountIdentifier}}) has been
  <strong>paused</strong> for <strong>{{data.businessName}}</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Paused on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.accountIdentifier',
            'data.providerName',
            'data.calendarName',
            'data.actionDate',
          ],
          optionalVariables: ['data.linkedCalendarsUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },

    // ── calendar_unlinked ────────────────────────────────────────────────────
    {
      eventKey:    'calendar_unlinked',
      displayName: 'Calendar Unlinked',
      description: 'Sent when a calendar is unlinked from the Business.',
      eventType:   'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar unlinked — {{data.calendarName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar <strong>{{data.calendarName}}</strong> ({{data.accountIdentifier}}) has been
  <strong>unlinked</strong> from <strong>{{data.businessName}}</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  This only removes the calendar from Business App.
  It does not delete the external calendar or its connection.
</p>
<p style="margin: 0; color: {{theme.mutedTextColor}}; font-size: 13px;">Unlinked on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.accountIdentifier',
            'data.providerName',
            'data.calendarName',
            'data.actionDate',
          ],
          optionalVariables: ['data.linkedCalendarsUrl'],
        },
        sms:  { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
  ],
};
