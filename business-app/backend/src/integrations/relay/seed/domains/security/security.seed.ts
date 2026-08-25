import type { CatalogDomain } from '../../../catalog/relay-catalog.types';

/**
 * Security domain — platform events for authentication and invitation flows.
 * All events are delivered via Platform credentials (RELAY_API_KEY).
 * These are the 7 events that exist in the Relay DB.
 */
export const SECURITY_SEED_DOMAIN: CatalogDomain = {
  domainKey: 'security',
  displayName: 'Security',
  domainCategory: 'system_notifications',
  isSystem: true,
  version: 1,
  events: [
    {
      eventKey: 'company_verify_email',
      displayName: 'Email Verification',
      description:
        'Deliver the email verification link to a business user who self-registered. Always delivered via platform credentials.',
      eventType: 'security',
      channels: {
        email: {
          enabled: true,
          subject: 'Verify your email address',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  Thank you for creating your account (<strong>{{data.email}}</strong>).
  Please verify your email address to activate it.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.verificationUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Verify Email Address
  </a>
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  This link expires on <strong>{{data.expiresAt}}</strong>.
  If you did not create this account, you can safely ignore this email.
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.verificationUrl',
            'data.expiresAt',
          ],
          optionalVariables: ['data.loginUrl'],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_forgot_password',
      displayName: 'Business Forgot Password',
      description: 'Deliver a password reset link to a business user.',
      eventType: 'security',
      channels: {
        email: {
          enabled: true,
          subject: 'Reset your password',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We received a request to reset the password for your account at
  <strong>{{data.businessName}}</strong>.
  Click the button below to choose a new password.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.resetUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Reset My Password
  </a>
</p>
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  This link expires on <strong>{{data.expiresAt}}</strong>.
  If you did not request a password reset, you can safely ignore this email.
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.businessName',
            'data.resetUrl',
            'data.expiresAt',
          ],
          optionalVariables: [],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_password_changed',
      displayName: 'Business Password Changed',
      description: 'Notify a business user that their password was changed.',
      eventType: 'security',
      channels: {
        email: {
          enabled: true,
          subject: 'Your password was changed',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We are confirming that the password for your account
  (<strong>{{data.email}}</strong>) at <strong>{{data.businessName}}</strong>
  was successfully changed on <strong>{{data.when}}</strong>.
</p>
{{#data.ipAddress}}
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  This change was made from IP address: <strong>{{data.ipAddress}}</strong>.
</p>
{{/data.ipAddress}}
<p style="margin: 0 0 16px;">
  If you did not make this change, please contact your administrator immediately.
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.businessName',
            'data.when',
          ],
          optionalVariables: ['data.ipAddress'],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_admin_invitation',
      displayName: 'Business Admin Invitation',
      description:
        'Deliver onboarding credentials to a newly provisioned business admin.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'You have been invited to manage {{data.businessName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  You have been invited to manage <strong>{{data.businessName}}</strong>
  with the role <strong>{{data.role}}</strong>.
</p>
<p style="margin: 0 0 16px;">
  Use the credentials below to log in for the first time:
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Email</td>
    <td style="padding: 4px 0;"><strong>{{data.email}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Temporary password</td>
    <td style="padding: 4px 0;">
      <strong style="font-family: monospace; background: {{theme.surfaceColor}}; padding: 2px 8px; border-radius: 4px; border: 1px solid {{theme.borderColor}};">{{data.tempPassword}}</strong>
    </td>
  </tr>
</table>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.businessName',
            'data.tempPassword',
            'data.loginUrl',
            'data.role',
          ],
          optionalVariables: [],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_user_invitation',
      displayName: 'Business User Invitation',
      description:
        'Deliver onboarding credentials to a business user invited by a business_owner or business_admin.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'You have been invited to join {{data.businessName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  You have been invited to join <strong>{{data.businessName}}</strong>
  with the role <strong>{{data.role}}</strong>.
</p>
<p style="margin: 0 0 16px;">
  Use the credentials below to log in for the first time:
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Email</td>
    <td style="padding: 4px 0;"><strong>{{data.email}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Temporary password</td>
    <td style="padding: 4px 0;">
      <strong style="font-family: monospace; background: {{theme.surfaceColor}}; padding: 2px 8px; border-radius: 4px; border: 1px solid {{theme.borderColor}};">{{data.tempPassword}}</strong>
    </td>
  </tr>
</table>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.businessName',
            'data.role',
            'data.email',
            'data.tempPassword',
            'data.loginUrl',
          ],
          optionalVariables: ['data.expiresAt'],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_invitation_resent',
      displayName: 'Business Invitation Resent',
      description:
        'Re-deliver invitation credentials when an admin resends a pending invitation.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Your invitation to {{data.businessName}} has been resent',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  Your invitation to join <strong>{{data.businessName}}</strong>
  as <strong>{{data.role}}</strong> has been resent with updated credentials.
</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Email</td>
    <td style="padding: 4px 0;"><strong>{{data.email}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 16px 4px 0; color: {{theme.mutedTextColor}};">Temporary password</td>
    <td style="padding: 4px 0;">
      <strong style="font-family: monospace; background: {{theme.surfaceColor}}; padding: 2px 8px; border-radius: 4px; border: 1px solid {{theme.borderColor}};">{{data.tempPassword}}</strong>
    </td>
  </tr>
</table>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.businessName',
            'data.tempPassword',
            'data.loginUrl',
            'data.role',
          ],
          optionalVariables: [],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
    {
      eventKey: 'company_welcome_message',
      displayName: 'Business Welcome Message',
      description:
        'Welcome an invited business user after they complete their first login and set a permanent password.',
      eventType: 'notification',
      channels: {
        email: {
          enabled: true,
          subject: 'Welcome to {{data.businessName}}',
          content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  Your account at <strong>{{data.businessName}}</strong> is now active.
  You have successfully completed your first login as <strong>{{data.role}}</strong>.
  We are excited to have you on board.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In to Your Account
  </a>
</p>`,
          requiredVariables: [
            'data.firstName',
            'data.email',
            'data.businessName',
            'data.loginUrl',
            'data.role',
          ],
          optionalVariables: [],
        },
        sms: { enabled: false, requiredVariables: [], optionalVariables: [] },
        push: { enabled: false, requiredVariables: [], optionalVariables: [] },
      },
    },
  ],
};
