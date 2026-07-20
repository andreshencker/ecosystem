export class ProvisioningReportDto {
  companyId!: string;

  /** Indicates which provisioning path was executed. */
  companyType!: 'platform' | 'tenant';

  created!: {
    theme: boolean;
    emailLayout: boolean;
    pdfLayout: boolean;
    /** Platform-only: whether the security domain was created. Always false for tenants. */
    securityDomain: boolean;
    /** Platform-only: event keys that were created. Always [] for tenants. */
    events: string[];
  };

  skipped!: {
    theme: boolean;
    emailLayout: boolean;
    pdfLayout: boolean;
    securityDomain: boolean;
    events: string[];
  };

  errors!: { asset: string; message: string }[];
}
