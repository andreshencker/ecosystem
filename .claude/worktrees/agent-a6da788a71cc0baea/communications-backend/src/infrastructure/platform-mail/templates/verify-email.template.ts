export interface VerifyEmailTemplateData {
  firstName: string;
  verificationUrl: string;
  platformName?: string;
}

export function verifyEmailHtml(data: VerifyEmailTemplateData): string {
  const { firstName, verificationUrl, platformName = 'Communication Platform' } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email — ${platformName}</title>
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #111827; padding: 32px 40px; }
    .header-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .body { padding: 40px; }
    .body h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .body p { font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; }
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
      <h1>Verify your email address</h1>
      <p>Hi ${firstName},</p>
      <p>Thanks for signing up. Please confirm your email address by clicking the button below.</p>
      <p>
        <a href="${verificationUrl}" class="btn">Verify Email</a>
      </p>
      <p>This link expires in 24 hours.</p>
      <p>If you did not create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="url-fallback">${verificationUrl}</p>
    </div>
  </div>
</body>
</html>`;
}

export function verifyEmailSubject(platformName = 'Communication Platform'): string {
  return `Verify your email — ${platformName}`;
}
