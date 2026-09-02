import type { CatalogDomain } from '../../../catalog/relay-catalog.types';

/**
 * calendar_sync domain — platform events for the shift-calendar sync engine.
 * All events use Platform credentials.
 */
export const CALENDAR_SYNC_SEED_DOMAIN: CatalogDomain = {
  domainKey: 'calendar_sync',
  displayName: 'Calendar Sync',
  domainCategory: 'system_notifications',
  isSystem: true,
  version: 1,
  events: [
    {
      eventKey: 'sync_completed',
      displayName: 'Sync Completed',
      description: 'Sent when a calendar sync finishes successfully.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar sync completed — {{data.calendarNames}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar sync for <strong>{{data.businessName}}</strong> has completed.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Calendars</td>
    <td style="padding: 4px 0;">{{data.calendarNames}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Imported</td>
    <td style="padding: 4px 0;"><strong>{{data.totalCreated}}</strong> new shifts</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Updated</td>
    <td style="padding: 4px 0;">{{data.totalUpdated}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Removed</td>
    <td style="padding: 4px 0;">{{data.totalDeleted}}</td>
  </tr>
</table>
<p style="margin: 0; color: {{theme.mutedTextColor}}; font-size: 13px;">Synced on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.calendarNames',
            'data.totalCreated',
            'data.totalUpdated',
            'data.totalDeleted',
            'data.actionDate',
          ],
          optionalVariables: ['data.totalErrors', 'data.shiftsUrl'],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'sync_failed',
      displayName: 'Sync Failed',
      description: 'Sent when a calendar sync encounters errors.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Calendar sync encountered errors — {{data.calendarNames}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The calendar sync for <strong>{{data.businessName}}</strong> completed with
  <strong>{{data.totalErrors}} error(s)</strong>.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Calendars</td>
    <td style="padding: 4px 0;">{{data.calendarNames}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Imported</td>
    <td style="padding: 4px 0;">{{data.totalCreated}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Errors</td>
    <td style="padding: 4px 0; color: #d32f2f;"><strong>{{data.totalErrors}}</strong></td>
  </tr>
</table>
<p style="margin: 0; color: {{theme.mutedTextColor}}; font-size: 13px;">Check the sync history in the app for details. Synced on {{data.actionDate}}.</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.calendarNames',
            'data.totalCreated',
            'data.totalErrors',
            'data.actionDate',
          ],
          optionalVariables: [
            'data.totalUpdated',
            'data.totalDeleted',
            'data.shiftsUrl',
          ],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
  ],
};
