'use client';

import { useGrapiflyTheme } from './GrapiflyThemeProvider';

export function BrandMark() {
  const theme = useGrapiflyTheme();
  return <img className="brand-mark" src={theme?.logoUrl ?? '/logos/grapifly-mark.svg'} alt="" aria-hidden="true" />;
}
