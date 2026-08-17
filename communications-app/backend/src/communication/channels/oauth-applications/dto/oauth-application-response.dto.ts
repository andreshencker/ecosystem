// Safe, list-friendly shape — never includes clientSecret.
export class OAuthApplicationResponseDto {
  id!: string;
  providerFamily!: string;
  displayName!: string;
  /** Masked for display, e.g. "30220002402-...975n.apps.googleusercontent.com". */
  clientId!: string;
  isActive!: boolean;
  /** True when this app belongs to the platform company — usable by any company ("ecosystem" mode). */
  isEcosystem!: boolean;
  createdAt!: string;
}
