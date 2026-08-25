export const DEFAULT_EMAIL_LAYOUT_KEY = 'default_email_layout';
export const DEFAULT_EMAIL_LAYOUT_NAME = 'Default Email Layout';

export const DEFAULT_EMAIL_LAYOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>{{company.displayName}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: {{theme.backgroundColor}};
      font-family: {{theme.fontFamily}};
      font-size: {{theme.fontSizeBase}};
      color: {{theme.textColor}};
      -webkit-text-size-adjust: 100%;
    }
    .email-wrapper {
      width: 100%;
      background-color: {{theme.backgroundColor}};
      padding: 32px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: {{theme.surfaceColor}};
      border: 1px solid {{theme.borderColor}};
      border-radius: 8px;
      overflow: hidden;
    }
    .email-header {
      background-color: {{theme.primaryColor}};
      padding: 24px 32px;
      text-align: center;
    }
    .email-header img {
      max-height: 48px;
      width: auto;
    }
    .email-header-name {
      color: #FFFFFF;
      font-size: 20px;
      font-weight: {{theme.fontWeightBold}};
      margin: 0;
      letter-spacing: -0.02em;
    }
    .email-body {
      padding: 32px;
      color: {{theme.textColor}};
      line-height: 1.6;
    }
    .email-body a {
      color: {{theme.linkColor}};
      text-decoration: none;
    }
    .email-body a:hover {
      text-decoration: underline;
    }
    .email-divider {
      border: none;
      border-top: 1px solid {{theme.borderColor}};
      margin: 24px 0;
    }
    .email-footer {
      background-color: {{theme.backgroundColor}};
      border-top: 1px solid {{theme.borderColor}};
      padding: 24px 32px;
      text-align: center;
    }
    .email-footer p {
      margin: 4px 0;
      color: {{theme.mutedTextColor}};
      font-size: 12px;
      line-height: 1.6;
    }
    .email-footer a {
      color: {{theme.mutedTextColor}};
      text-decoration: underline;
    }
    .email-footer .footer-links {
      margin: 8px 0;
    }
    .email-footer .footer-links a {
      margin: 0 8px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        border-radius: 0;
        border-left: none;
        border-right: none;
      }
      .email-body {
        padding: 24px 16px;
      }
      .email-footer {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">

      <!-- Header -->
      <div class="email-header">
        {{#company.logoFullUrl}}
          <img src="{{company.logoFullUrl}}" alt="{{company.displayName}}" />
        {{/company.logoFullUrl}}
        {{^company.logoFullUrl}}
          <p class="email-header-name">{{company.displayName}}</p>
        {{/company.logoFullUrl}}
      </div>

      <!-- Body content injected at runtime -->
      <div class="email-body">
        {{content}}
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>{{company.copyrightText}}</p>
        <div class="footer-links">
          {{#company.privacyPolicyUrl}}<a href="{{company.privacyPolicyUrl}}">Privacy Policy</a>{{/company.privacyPolicyUrl}}
          {{#company.termsUrl}}<a href="{{company.termsUrl}}">Terms of Service</a>{{/company.termsUrl}}
          {{#company.unsubscribeUrl}}<a href="{{company.unsubscribeUrl}}">Unsubscribe</a>{{/company.unsubscribeUrl}}
        </div>
        {{#company.supportEmail}}
          <p>Questions? <a href="mailto:{{company.supportEmail}}">{{company.supportEmail}}</a></p>
        {{/company.supportEmail}}
        {{#company.webBaseUrl}}
          <p><a href="{{company.webBaseUrl}}">{{company.displayName}}</a></p>
        {{/company.webBaseUrl}}
      </div>

    </div>
  </div>
</body>
</html>`;

export const DEFAULT_EMAIL_LAYOUT_REQUIRED_VARIABLES = [
  'company.displayName',
  'company.copyrightText',
];

export const DEFAULT_EMAIL_LAYOUT_OPTIONAL_VARIABLES = [
  'company.logoFullUrl',
  'company.supportEmail',
  'company.privacyPolicyUrl',
  'company.termsUrl',
  'company.unsubscribeUrl',
  'company.webBaseUrl',
  'theme.primaryColor',
  'theme.secondaryColor',
  'theme.backgroundColor',
  'theme.surfaceColor',
  'theme.textColor',
  'theme.mutedTextColor',
  'theme.borderColor',
  'theme.linkColor',
  'theme.fontFamily',
  'theme.fontSizeBase',
  'theme.fontWeightNormal',
  'theme.fontWeightBold',
];
