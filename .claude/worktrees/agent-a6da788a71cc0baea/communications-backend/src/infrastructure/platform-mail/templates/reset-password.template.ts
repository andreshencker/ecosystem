export interface ResetPasswordTemplateData {
  firstName: string;
  resetUrl: string;
  platformName?: string;
}

export function resetPasswordHtml(data: ResetPasswordTemplateData): string {
  const { firstName, resetUrl, platformName = 'Communication Platform' } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password — ${platformName}</title>
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #111827; padding: 32px 40px; }
    .header-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .body { padding: 40px; }
    .body h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .body p { font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 18px; }
    .warning p { color: #92400e; font-size: 13px; margin: 0; }
    .footer { padding: 24px 40px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.5; }
    .url-fallback { word-break: break-all; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-title">${platformName}</p>
    </div>
    <div class="body">
      <h1>Reset your password</h1>
      <p>Hi ${firstName},</p>
      <p>We received a request to reset the password for your account. Click the button below to choose a new one.</p>
      <p>
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      <p>This link expires in 1 hour.</p>
      <div class="warning">
        <p>If you did not request a password reset, please ignore this email. Your password will not change.</p>
      </div>
    </div>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="url-fallback">${resetUrl}</p>
    </div>
  </div>
</body>
</html>`;
}

export function resetPasswordSubject(platformName = 'Communication Platform'): string {
  return `Reset your password — ${platformName}`;
}
