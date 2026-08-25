// src/common/template-engine/template-renderer.service.ts
import { Injectable } from '@nestjs/common';

type ApplyOptions = {
  leaveDataPlaceholders?: boolean; // deja {{data.xxx}} si no hay valor
};

@Injectable()
export class TemplateRendererService {
  applyVariables(
    template: string,
    variables: Record<string, any>,
    options: ApplyOptions = {},
  ): string {
    const input = template ?? '';

    return input.replace(/{{\s*([^}]+?)\s*}}/g, (match, rawKey) => {
      const key = String(rawKey ?? '').trim();

      // No tocamos {{content}} aquí (composer lo inyecta antes)
      if (key === 'content') return match;

      const value = this.resolveWithFallback(variables, key);

      // Respeta leaveDataPlaceholders para data.*
      if (
        options.leaveDataPlaceholders === true &&
        key.startsWith('data.') &&
        (value === undefined || value === null || value === '')
      ) {
        return match;
      }

      return value === undefined || value === null ? '' : String(value);
    });
  }

  injectContent(layoutHtml: string, contentHtml: string): string {
    const layout = layoutHtml ?? '';
    const content = contentHtml ?? '';
    return layout.replace(/{{\s*content\s*}}/g, content);
  }

  injectCss(layoutHtml: string, css: string): string {
    const html = layoutHtml ?? '';
    const style = (css ?? '').trim();
    if (!style) return html;

    if (html.includes('{{css}}')) {
      return html.replace(/{{\s*css\s*}}/g, style);
    }

    if (html.includes('</head>')) {
      return html.replace('</head>', `<style>${style}</style></head>`);
    }

    return `<style>${style}</style>${html}`;
  }

  // -------------------------
  // Resolver con fallback (compatibilidad)
  // -------------------------
  private resolveWithFallback(vars: Record<string, any>, key: string) {
    // 1) lookup normal
    const direct = this.getByPath(vars, key);
    if (!(direct === undefined || direct === null)) return direct;

    // 2) fallback aliases -> paths reales
    // OJO: solo aplica si NO existe el valor directo
    const aliasPath = this.getAliasPath(key);
    if (!aliasPath) return direct;

    const fallbackValue = this.getByPath(vars, aliasPath);
    return fallbackValue;
  }

  /**
   * Mapa central de compatibilidad.
   * Si el template pide {{brandText}}, lo resolvemos desde {{theme.textColor}}.
   */
  private getAliasPath(key: string): string | null {
    // BRAND (legacy)
    const BRAND_ALIASES: Record<string, string> = {
      brandPrimary: 'theme.primaryColor',
      brandSecondary: 'theme.secondaryColor',
      brandText: 'theme.textColor',
      brandMuted: 'theme.mutedTextColor',
      brandBorder: 'theme.borderColor',
      brandLink: 'theme.linkColor',

      // Tipografía legacy (si las usas)
      fontFamily: 'theme.fontFamily',
      fontSizeBase: 'theme.fontSizeBase',
      fontWeightNormal: 'theme.fontWeightNormal',
      fontWeightBold: 'theme.fontWeightBold',

      // Compat común antigua (por si aparece)
      companyName: 'company.displayName',
      logoFullUrl: 'company.logoFullUrl',
    };

    return BRAND_ALIASES[key] ?? null;
  }

  // -------------------------
  // Helpers
  // -------------------------
  private getByPath(obj: any, path: string) {
    const parts = String(path ?? '')
      .split('.')
      .map((p) => p.trim())
      .filter(Boolean);

    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
}
