// Countries where Stripe Connect can onboard a connected account.
// Source: Stripe "Connect — Available countries" (https://stripe.com/global).
// The backend only validates the ISO-3166-1 alpha-2 shape; Stripe itself is the
// final authority at account-creation time. Keep this list alphabetical by name.

export interface CountryOption {
    code: string; // ISO 3166-1 alpha-2, uppercase
    name: string;
}

export const STRIPE_CONNECT_COUNTRIES: CountryOption[] = [
    { code: "AU", name: "Australia" },
    { code: "AT", name: "Austria" },
    { code: "BE", name: "Belgium" },
    { code: "BR", name: "Brazil" },
    { code: "BG", name: "Bulgaria" },
    { code: "CA", name: "Canada" },
    { code: "HR", name: "Croatia" },
    { code: "CY", name: "Cyprus" },
    { code: "CZ", name: "Czech Republic" },
    { code: "DK", name: "Denmark" },
    { code: "EE", name: "Estonia" },
    { code: "FI", name: "Finland" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "GI", name: "Gibraltar" },
    { code: "GR", name: "Greece" },
    { code: "HK", name: "Hong Kong" },
    { code: "HU", name: "Hungary" },
    { code: "IE", name: "Ireland" },
    { code: "IT", name: "Italy" },
    { code: "JP", name: "Japan" },
    { code: "LV", name: "Latvia" },
    { code: "LI", name: "Liechtenstein" },
    { code: "LT", name: "Lithuania" },
    { code: "LU", name: "Luxembourg" },
    { code: "MY", name: "Malaysia" },
    { code: "MT", name: "Malta" },
    { code: "MX", name: "Mexico" },
    { code: "NL", name: "Netherlands" },
    { code: "NZ", name: "New Zealand" },
    { code: "NO", name: "Norway" },
    { code: "PL", name: "Poland" },
    { code: "PT", name: "Portugal" },
    { code: "RO", name: "Romania" },
    { code: "SG", name: "Singapore" },
    { code: "SK", name: "Slovakia" },
    { code: "SI", name: "Slovenia" },
    { code: "ES", name: "Spain" },
    { code: "SE", name: "Sweden" },
    { code: "CH", name: "Switzerland" },
    { code: "TH", name: "Thailand" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "GB", name: "United Kingdom" },
    { code: "US", name: "United States" },
];

const NAME_BY_CODE = new Map(STRIPE_CONNECT_COUNTRIES.map((c) => [c.code, c.name]));

export function countryName(code: string): string {
    return NAME_BY_CODE.get(code.toUpperCase()) ?? code.toUpperCase();
}

export function isStripeConnectCountry(code: string): boolean {
    return NAME_BY_CODE.has(code.toUpperCase());
}
