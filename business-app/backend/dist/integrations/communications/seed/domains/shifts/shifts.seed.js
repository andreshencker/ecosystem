"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHIFTS_SEED_DOMAIN = void 0;
exports.SHIFTS_SEED_DOMAIN = {
    domainKey: 'shifts',
    displayName: 'Shifts',
    domainCategory: 'system_notifications',
    isSystem: true,
    version: 1,
    events: [
        {
            eventKey: 'shift_created',
            displayName: 'Shift Created',
            description: 'Notify the actor when a new shift is created.',
            eventType: 'notification',
            channels: {
                email: {
                    enabled: true,
                    subject: 'Shift created — {{data.shiftDate}}',
                    content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  A new shift has been created for the contract <strong>{{data.contractName}}</strong> at <strong>{{data.businessName}}</strong>.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Date</td>
    <td style="padding: 4px 0;"><strong>{{data.shiftDate}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Time</td>
    <td style="padding: 4px 0;">{{data.startTime}} – {{data.endTime}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Status</td>
    <td style="padding: 4px 0;">{{data.shiftStatus}}</td>
  </tr>
  {{#data.location}}
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Location</td>
    <td style="padding: 4px 0;">{{data.location}}</td>
  </tr>
  {{/data.location}}
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Created on {{data.actionDate}}.</p>`,
                    requiredVariables: ['data.firstName', 'data.businessName', 'data.contractName', 'data.shiftDate', 'data.startTime', 'data.endTime', 'data.shiftStatus', 'data.actionDate'],
                    optionalVariables: ['data.location', 'data.notes', 'data.shiftUrl'],
                },
                sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
                push: { enabled: false, requiredVariables: [], optionalVariables: [] },
            },
        },
        {
            eventKey: 'shift_updated',
            displayName: 'Shift Updated',
            description: 'Notify the actor when a shift is updated.',
            eventType: 'notification',
            channels: {
                email: {
                    enabled: true,
                    subject: 'Shift updated — {{data.shiftDate}}',
                    content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The shift for <strong>{{data.contractName}}</strong> on <strong>{{data.shiftDate}}</strong> has been updated.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Time</td>
    <td style="padding: 4px 0;">{{data.startTime}} – {{data.endTime}}</td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Status</td>
    <td style="padding: 4px 0;">{{data.shiftStatus}}</td>
  </tr>
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Updated on {{data.actionDate}}.</p>`,
                    requiredVariables: ['data.firstName', 'data.businessName', 'data.contractName', 'data.shiftDate', 'data.startTime', 'data.endTime', 'data.shiftStatus', 'data.actionDate'],
                    optionalVariables: ['data.location', 'data.notes', 'data.shiftUrl'],
                },
                sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
                push: { enabled: false, requiredVariables: [], optionalVariables: [] },
            },
        },
        {
            eventKey: 'shift_confirmed',
            displayName: 'Shift Confirmed',
            description: 'Notify the actor when a shift is confirmed.',
            eventType: 'notification',
            channels: {
                email: {
                    enabled: true,
                    subject: 'Shift confirmed — {{data.shiftDate}}',
                    content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The shift for <strong>{{data.contractName}}</strong> on <strong>{{data.shiftDate}}</strong> has been <strong>confirmed</strong>.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Date</td>
    <td style="padding: 4px 0;"><strong>{{data.shiftDate}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Time</td>
    <td style="padding: 4px 0;">{{data.startTime}} – {{data.endTime}}</td>
  </tr>
  {{#data.location}}
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Location</td>
    <td style="padding: 4px 0;">{{data.location}}</td>
  </tr>
  {{/data.location}}
</table>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Confirmed on {{data.actionDate}}.</p>`,
                    requiredVariables: ['data.firstName', 'data.businessName', 'data.contractName', 'data.shiftDate', 'data.startTime', 'data.endTime', 'data.shiftStatus', 'data.actionDate'],
                    optionalVariables: ['data.location', 'data.notes', 'data.shiftUrl'],
                },
                sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
                push: { enabled: false, requiredVariables: [], optionalVariables: [] },
            },
        },
        {
            eventKey: 'shift_cancelled',
            displayName: 'Shift Cancelled',
            description: 'Notify the actor when a shift is cancelled.',
            eventType: 'notification',
            channels: {
                email: {
                    enabled: true,
                    subject: 'Shift cancelled — {{data.shiftDate}}',
                    content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The shift for <strong>{{data.contractName}}</strong> on <strong>{{data.shiftDate}}</strong> has been <strong>cancelled</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Cancelled on {{data.actionDate}}.</p>`,
                    requiredVariables: ['data.firstName', 'data.businessName', 'data.contractName', 'data.shiftDate', 'data.startTime', 'data.endTime', 'data.shiftStatus', 'data.actionDate'],
                    optionalVariables: ['data.location', 'data.notes', 'data.shiftUrl'],
                },
                sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
                push: { enabled: false, requiredVariables: [], optionalVariables: [] },
            },
        },
        {
            eventKey: 'shift_deleted',
            displayName: 'Shift Deleted',
            description: 'Notify the actor when a shift is permanently deleted.',
            eventType: 'notification',
            channels: {
                email: {
                    enabled: true,
                    subject: 'Shift deleted — {{data.shiftDate}}',
                    content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  The shift for <strong>{{data.contractName}}</strong> on <strong>{{data.shiftDate}}</strong> ({{data.startTime}} – {{data.endTime}}) has been <strong>deleted</strong>.
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">Deleted on {{data.actionDate}}.</p>`,
                    requiredVariables: ['data.firstName', 'data.businessName', 'data.contractName', 'data.shiftDate', 'data.startTime', 'data.endTime', 'data.shiftStatus', 'data.actionDate'],
                    optionalVariables: ['data.location', 'data.notes'],
                },
                sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
                push: { enabled: false, requiredVariables: [], optionalVariables: [] },
            },
        },
    ],
};
//# sourceMappingURL=shifts.seed.js.map