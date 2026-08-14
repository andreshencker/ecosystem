import type { TemplateRendererService } from '../../../common/template-engine/template-renderer.service';

export type ComposeHtmlParams = {
  layoutHtml: string;
  layoutCss?: string;
  contentHtml?: string;

  context?: {
    company?: any;
    theme?: any;
  };

  data?: Record<string, any>;

  meta?: Record<string, any>; // meta flexible (year, generatedAtPretty, etc.)

  leaveDataPlaceholders?: boolean;
};

export function composeHtml(
  renderer: TemplateRendererService,
  params: ComposeHtmlParams,
): string {
  const company = params.context?.company ?? {};
  const theme = params.context?.theme ?? {};
  const meta = params.meta ?? {};

  // ✅ Variables PLANAS + anidadas
  const rootVars = {
    ...company,
    ...theme,
    ...meta,

    company,
    theme,
    meta,

    data: params.data ?? {},
  };

  // 1) CSS
  const withCss = renderer.injectCss(
    params.layoutHtml ?? '',
    params.layoutCss ?? '',
  );

  // 2) Content
  const withContent =
    typeof params.contentHtml === 'string'
      ? renderer.injectContent(withCss, params.contentHtml)
      : withCss;

  // 3) Variables
  if (!params.leaveDataPlaceholders) {
    return renderer.applyVariables(withContent, rootVars);
  }

  // preview: deja {{data.xxx}} sin resolver
  return renderer.applyVariables(withContent, { ...rootVars, data: {} });
}
