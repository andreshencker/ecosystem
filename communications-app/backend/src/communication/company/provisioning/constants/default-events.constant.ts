/**
 * Default modules events — provisioned ONLY on the Platform Company (isPlatformCompany: true).
 *
 * Rules (from architecture decision):
 *   scope       = 'modules'   — these events belong to the modules catalogue.
 *   senderScope = 'modules'   — emails are always delivered via Platform Company credentials
 *                                regardless of which tenant triggered the notification.
 *
 * Templates must use data.* variables for tenant-specific context (company name, etc.)
 * instead of company.* bindings, because the modules company is always the sender and
 * the render context is that of Grapifly, not the tenant.
 */

export interface DefaultEventDefinition {
  eventKey: string;
  displayName: string;
  description: string;
  eventType: 'notification' | 'alert' | 'request' | 'security';
  scope: 'platform' | 'company';
  senderScope: 'platform' | 'company';
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

export const DEFAULT_PLATFORM_EVENTS: DefaultEventDefinition[] = [

  // ── Authentication ───────────────────────────────────────────────────────────

  {
    eventKey: 'company_verify_email',
    displayName: 'Email Verification',
    description: 'Deliver the email verification link to a user who self-registered. Always routed through the modules company (DEC-009 Rev-2 §2).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
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
</p>
{{#data.loginUrl}}
<p style="margin: 16px 0 0; color: {{theme.mutedTextColor}}; font-size: 13px;">
  Already verified?
  <a href="{{data.loginUrl}}" style="color: {{theme.linkColor}};">Log in here</a>.
</p>
{{/data.loginUrl}}`,
        requiredVariables: ['data.firstName', 'data.email', 'data.verificationUrl', 'data.expiresAt'],
        optionalVariables: ['data.loginUrl'],
      },
    },
  },

  // ── Invitation events ────────────────────────────────────────────────────────

  {
    eventKey: 'platform_admin_invitation',
    displayName: 'Platform Admin Invitation',
    description: 'Deliver onboarding credentials to a newly invited modules administrator (platform_admin → platform_admin flow, DEC-013).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'You have been invited to join the modules team',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  You have been invited to join the platform administration team
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
<p style="margin: 0 0 24px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  You will be required to set a new password after your first login.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>
<p style="margin: 16px 0 0; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not expect this invitation, you can safely ignore this email.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.tempPassword', 'data.loginUrl', 'data.role'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'company_admin_invitation',
    displayName: 'Company Admin Invitation',
    description: 'Deliver onboarding credentials to a newly provisioned company administrator. Sent via modules credentials so the tenant does not need SMTP configured yet (DEC-009 §4 Rev-1).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'You have been invited to manage {{data.companyName}}',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  You have been invited to manage <strong>{{data.companyName}}</strong>
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
<p style="margin: 0 0 24px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  You will be required to set a new password after your first login.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>
<p style="margin: 16px 0 0; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not expect this invitation, you can safely ignore this email.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.companyName', 'data.tempPassword', 'data.loginUrl', 'data.role'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'company_user_invitation',
    displayName: 'Company User Invitation',
    description: 'Deliver onboarding credentials to a company user invited by a company_owner or company_admin. Sent via modules credentials (DEC-013).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'You have been invited to join {{data.companyName}}',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  You have been invited to join <strong>{{data.companyName}}</strong>
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
<p style="margin: 0 0 24px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  You will be required to set a new password after your first login.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>
<p style="margin: 16px 0 0; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not expect this invitation, you can safely ignore this email.
</p>`,
        requiredVariables: ['data.firstName', 'data.companyName', 'data.role', 'data.email', 'data.tempPassword', 'data.loginUrl'],
        optionalVariables: ['data.expiresAt'],
      },
    },
  },

  {
    eventKey: 'company_invitation_resent',
    displayName: 'Company Invitation Resent',
    description: 'Re-deliver invitation credentials when an admin resends a pending invitation. Sent via modules credentials (DEC-013).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Your invitation to {{data.companyName}} has been resent',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  Your invitation to join <strong>{{data.companyName}}</strong>
  as <strong>{{data.role}}</strong> has been resent with updated credentials.
</p>
<p style="margin: 0 0 16px;">
  Use the credentials below to log in:
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
<p style="margin: 0 0 24px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  You will be required to set a new password after your first login.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In Now
  </a>
</p>
<p style="margin: 16px 0 0; color: {{theme.mutedTextColor}}; font-size: 13px;">
  If you did not expect this invitation, you can safely ignore this email.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.companyName', 'data.tempPassword', 'data.loginUrl', 'data.role'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'company_welcome_message',
    displayName: 'Company Welcome Message',
    description: 'Welcome an invited company user after they complete their first login and set a permanent password. Sent via modules credentials (DEC-013).',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Welcome to {{data.companyName}}',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  Your account at <strong>{{data.companyName}}</strong> is now active.
  You have successfully completed your first login as <strong>{{data.role}}</strong>.
  We are excited to have you on board.
</p>
<p style="margin: 0 0 24px;">
  Log in any time to get started.
</p>
<p style="margin: 0 0 24px; text-align: center;">
  <a href="{{data.loginUrl}}"
     style="display: inline-block; padding: 12px 24px; background-color: {{theme.primaryColor}}; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Log In to Your Account
  </a>
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.companyName', 'data.loginUrl', 'data.role'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'company_password_changed',
    displayName: 'Company Password Changed',
    description: 'Notify a company user that their password was changed. Sent via modules credentials.',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Your password was changed',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We are confirming that the password for your account
  (<strong>{{data.email}}</strong>) at <strong>{{data.companyName}}</strong>
  was successfully changed on <strong>{{data.when}}</strong>.
</p>
{{#data.ipAddress}}
<p style="margin: 0 0 16px; color: {{theme.mutedTextColor}}; font-size: 13px;">
  This change was made from IP address: <strong>{{data.ipAddress}}</strong>.
</p>
{{/data.ipAddress}}
<p style="margin: 0 0 16px;">
  If you did not make this change, please contact your company administrator immediately.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.companyName', 'data.when'],
        optionalVariables: ['data.changedAt', 'data.ipAddress'],
      },
    },
  },

  {
    eventKey: 'company_forgot_password',
    displayName: 'Company Forgot Password',
    description: 'Deliver a password reset link to a company user. Sent via modules credentials.',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Reset your password',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We received a request to reset the password for your account at
  <strong>{{data.companyName}}</strong>.
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
  If you did not request a password reset, you can safely ignore this email —
  your password will not be changed.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.companyName', 'data.resetUrl', 'data.expiresAt'],
        optionalVariables: [],
      },
    },
  },

  // ── Platform-admin events ────────────────────────────────────────────────────

  {
    eventKey: 'platform_forgot_password',
    displayName: 'Platform Admin Forgot Password',
    description: 'Deliver a password reset link to a modules admin user.',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Reset your modules password',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We received a request to reset the password for your platform administrator account.
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
  If you did not request a password reset, you can safely ignore this email —
  your password will not be changed.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.resetUrl', 'data.expiresAt'],
        optionalVariables: [],
      },
    },
  },

  {
    eventKey: 'platform_password_changed',
    displayName: 'Platform Admin Password Changed',
    description: 'Notify a modules admin that their password was changed.',
    eventType: 'security',
    scope: 'platform',
    senderScope: 'platform',
    channelContent: {
      email: {
        enabled: true,
        subject: 'Your modules password was changed',
        content: `<p style="margin: 0 0 16px;">Hi <strong>{{data.firstName}}</strong>,</p>
<p style="margin: 0 0 16px;">
  We are confirming that the password for your platform administrator account
  (<strong>{{data.email}}</strong>) was successfully changed on <strong>{{data.when}}</strong>.
</p>
<p style="margin: 0 0 16px;">
  If you did not make this change, please contact the security team immediately.
</p>`,
        requiredVariables: ['data.firstName', 'data.email', 'data.when'],
        optionalVariables: ['data.changedAt'],
      },
    },
  },

  // Integration token lifecycle events live in the 'notifications' domain
  // (domainKey: 'notifications'), not here. See default-notifications-events.constant.ts.
];

/**
 * @deprecated Use DEFAULT_PLATFORM_EVENTS. This alias exists only so any
 * reference that was not updated yet still compiles. Remove after next cleanup.
 */
export const DEFAULT_COMPANY_EVENTS = DEFAULT_PLATFORM_EVENTS;
