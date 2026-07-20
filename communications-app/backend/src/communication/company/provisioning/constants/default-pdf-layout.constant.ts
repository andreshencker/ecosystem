export const DEFAULT_PDF_LAYOUT_KEY = 'default_pdf_layout';
export const DEFAULT_PDF_LAYOUT_NAME = 'Default PDF Layout';

export const DEFAULT_PDF_LAYOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{company.displayName}}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: {{theme.fontFamily}};
      font-size: {{theme.fontSizeBase}};
      color: {{theme.textColor}};
      background-color: #FFFFFF;
      line-height: 1.6;
    }
    .page {
      width: 100%;
      padding: 0;
    }
    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 40px;
      border-bottom: 2px solid {{theme.primaryColor}};
      margin-bottom: 32px;
    }
    .pdf-header-logo img {
      max-height: 48px;
      width: auto;
    }
    .pdf-header-company {
      font-size: 22px;
      font-weight: {{theme.fontWeightBold}};
      color: {{theme.primaryColor}};
    }
    .pdf-header-meta {
      text-align: right;
      color: {{theme.mutedTextColor}};
      font-size: 12px;
    }
    .pdf-body {
      padding: 0 40px;
      color: {{theme.textColor}};
    }
    .pdf-body a {
      color: {{theme.linkColor}};
      text-decoration: none;
    }
    .pdf-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 40px;
      border-top: 1px solid {{theme.borderColor}};
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: {{theme.mutedTextColor}};
    }
    .pdf-footer-left {
      flex: 1;
    }
    .pdf-footer-right {
      flex: 1;
      text-align: right;
    }
    .page-number::before {
      content: "Page " counter(page);
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="pdf-header">
      <div class="pdf-header-logo">
        {{#company.logoFullUrl}}
          <img src="{{company.logoFullUrl}}" alt="{{company.displayName}}" />
        {{/company.logoFullUrl}}
        {{^company.logoFullUrl}}
          <span class="pdf-header-company">{{company.displayName}}</span>
        {{/company.logoFullUrl}}
      </div>
      <div class="pdf-header-meta">
        <div>{{company.legalName}}</div>
        {{#company.supportEmail}}<div>{{company.supportEmail}}</div>{{/company.supportEmail}}
        {{#company.webBaseUrl}}<div>{{company.webBaseUrl}}</div>{{/company.webBaseUrl}}
      </div>
    </div>

    <!-- Body content injected at runtime -->
    <div class="pdf-body">
      {{content}}
    </div>

    <!-- Footer -->
    <div class="pdf-footer">
      <div class="pdf-footer-left">{{company.copyrightText}}</div>
      <div class="pdf-footer-right">
        <span class="page-number"></span>
      </div>
    </div>

  </div>
</body>
</html>`;

export const DEFAULT_PDF_LAYOUT_REQUIRED_VARIABLES = [
  'company.displayName',
  'company.copyrightText',
];

export const DEFAULT_PDF_LAYOUT_OPTIONAL_VARIABLES = [
  'company.legalName',
  'company.logoFullUrl',
  'company.supportEmail',
  'company.webBaseUrl',
  'theme.primaryColor',
  'theme.fontFamily',
  'theme.fontSizeBase',
  'theme.fontWeightBold',
  'theme.textColor',
  'theme.mutedTextColor',
  'theme.borderColor',
  'theme.linkColor',
];
