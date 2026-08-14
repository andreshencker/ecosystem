// src/common/template-engine/template-composer.service.ts
import { Injectable } from '@nestjs/common';
import { TemplateRendererService } from './template-renderer.service';

export type ComposeParams = {
  layoutHtml: string;
  layoutCss?: string;
  contentHtml?: string;

  context?: {
    company?: any;
    theme?: any;
  };

  data?: Record<string, any>;
  meta?: Record<string, any>;

  leaveDataPlaceholders?: boolean;
};

@Injectable()
export class TemplateComposerService {
  constructor(private readonly renderer: TemplateRendererService) {}

  compose(params: ComposeParams): string {
    const company = params.context?.company ?? {};
    const theme = params.context?.theme ?? {};
    const meta = params.meta ?? {};
    const data = params.data ?? {};

    /**
     * ✅ Aliases / Backwards-compat:
     * Permite seguir usando variables antiguas tipo:
     * {{brandText}}, {{brandMuted}}, {{brandPrimary}}, {{brandBorder}}, etc.
     *
     * También sirve para templates de eventos (EventCatalogue) que usan esos nombres.
     */
    const brandAliases = {
      // Colores “brand”
      brandPrimary: theme.primaryColor ?? theme.brandPrimary ?? '',
      brandSecondary: theme.secondaryColor ?? theme.brandSecondary ?? '',
      brandText: theme.textColor ?? theme.brandText ?? '',
      brandMuted: theme.mutedTextColor ?? theme.brandMuted ?? '',
      brandBorder: theme.borderColor ?? theme.brandBorder ?? '',
      brandLink: theme.linkColor ?? theme.brandLink ?? '',

      // Tipografía
      fontFamily: theme.fontFamily ?? '',
      fontSizeBase: theme.fontSizeBase ?? '',
      fontWeightNormal: theme.fontWeightNormal ?? '',
      fontWeightBold: theme.fontWeightBold ?? '',
    };

    /**
     * Variables accesibles:
     * - Plano (compat): {{brandText}}, {{brandPrimary}}, {{company.displayName}}, etc.
     * - Anidado: {{company.displayName}}, {{theme.primaryColor}}, {{meta.year}}
     * - Data de evento: {{data.reportName}}, {{data.errorMessage}}, etc.
     */
    const rootVars = {
      // ✅ plano (compat)
      ...brandAliases,

      // ⚠️ Si ya tenías templates viejos que esperaban company/theme "plano",
      // mantenemos esto. Si un día quieres evitar colisiones, lo quitamos.
      ...company,
      ...theme,
      ...meta,

      // ✅ anidado (recomendado)
      company,
      theme,
      meta,

      // ✅ data del evento
      data,
    };

    // 1) layout + content
    const withContent = this.renderer.injectContent(
      params.layoutHtml ?? '',
      params.contentHtml ?? '',
    );

    // 2) css
    const withCss = this.renderer.injectCss(
      withContent,
      params.layoutCss ?? '',
    );

    // 3) variables
    return this.renderer.applyVariables(withCss, rootVars, {
      leaveDataPlaceholders: params.leaveDataPlaceholders === true,
    });
  }
}
