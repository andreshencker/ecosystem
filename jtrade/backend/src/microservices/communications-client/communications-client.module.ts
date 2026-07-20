import { Module } from '@nestjs/common';

import { NotificationsClient } from './notifications/notifications-client';

// Companies
import { CompaniesCommunicationsClient } from './companyInfo/companies-client';
import { CompaniesController } from './companyInfo/companies.controller';

// Company Themes
import { CompanyThemesCommunicationsClient } from './companytheme/company-themes-client';
import { CompanyThemesController } from './companytheme/company-themes.controller';

// Layout Templates
import { LayoutTemplatesController } from './layoutTemplate/layout-templates.controller';
import { LayoutTemplatesCommunicationsClient } from './layoutTemplate/layout-templates.client';

// Domain Catalogue
import { DomainCatalogueCommunicationsClient } from './domainCatalogue/domain-catalogue.client';
import { DomainCatalogueController } from './domainCatalogue/domain-catalogue.controller';

// Provider Credentials
import { ProviderCredentialsCommunicationsClient } from './providersCredentials/provider-credentials.client';
import { ProviderCredentialsController } from './providersCredentials/provider-credentials.controller';

@Module({
  controllers: [
    CompaniesController,
    CompanyThemesController,
    LayoutTemplatesController,
    DomainCatalogueController,
    ProviderCredentialsController,
  ],
  providers: [
    NotificationsClient,
    CompaniesCommunicationsClient,
    CompanyThemesCommunicationsClient,
    LayoutTemplatesCommunicationsClient,
    DomainCatalogueCommunicationsClient,
    ProviderCredentialsCommunicationsClient,
  ],
  exports: [
    NotificationsClient,
    CompaniesCommunicationsClient,
    CompanyThemesCommunicationsClient,
    LayoutTemplatesCommunicationsClient,
    DomainCatalogueCommunicationsClient,
    ProviderCredentialsCommunicationsClient,
  ],
})
export class CommunicationsClientModule {}
