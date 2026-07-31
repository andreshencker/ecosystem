/**
 * Formats an integer minor-unit amount into a human-readable currency string.
 *
 * Uses Intl.NumberFormat to determine the correct minor-unit factor per
 * currency — do NOT divide every currency by 100.
 *
 * Examples:
 *   formatAmountMinor(10000, 'aud')  → "A$100.00"
 *   formatAmountMinor(5000,  'jpy')  → "¥5,000"   (JPY has no minor unit)
 *   formatAmountMinor(5000,  'kwd')  → "KD5.000"  (KWD has 3 decimal places)
 */
export function formatAmountMinor(
  amountMinor: number,
  currency: string,
): string {
  const upperCurrency = currency.toUpperCase();
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: upperCurrency,
    });
    const fractionDigits =
      formatter.resolvedOptions().minimumFractionDigits ?? 2;
    const divisor = Math.pow(10, fractionDigits);
    return formatter.format(amountMinor / divisor);
  } catch {
    // Fallback for unsupported or unknown currency codes
    const fallback = (amountMinor / 100).toFixed(2);
    return `${upperCurrency} ${fallback}`;
  }
}
