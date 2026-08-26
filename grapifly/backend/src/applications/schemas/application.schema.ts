import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { RoleFlow } from '../../roles/role-catalog.service';

export type ApplicationDocument = HydratedDocument<Application>;

export interface ApplicationDefaultAccess {
  autoGrantOnSignup: boolean;
  tier: 'trial' | 'free' | 'paid';
  requiresApproval: boolean;
}

export interface ApplicationThemePalette {
  primaryColor: string;
  /** Text/icon color rendered on top of primaryColor (e.g. contained button labels) — explicit so it never has to be guessed via contrast math. */
  primaryContrastText: string;
  backgroundColor: string;
  textColor: string;
}

export interface ApplicationTheme {
  icon: string;
  logoUrl: string | null;
  /** Used instead of logoUrl when the app is rendered in dark mode; falls back to logoUrl if null. */
  logoUrlDark: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  light: ApplicationThemePalette;
  dark: ApplicationThemePalette;
}

export interface ApplicationCountryRestriction {
  enabled: boolean;
  countries: string[];
}

export const DEFAULT_LIGHT_PALETTE: ApplicationThemePalette = { primaryColor: '#5c47ce', primaryContrastText: '#ffffff', backgroundColor: '#efeaff', textColor: '#111116' };
export const DEFAULT_DARK_PALETTE: ApplicationThemePalette = { primaryColor: '#8f7dff', primaryContrastText: '#ffffff', backgroundColor: '#17151f', textColor: '#f5f4fa' };
export const DEFAULT_THEME: ApplicationTheme = { icon: '', logoUrl: null, logoUrlDark: null, faviconUrl: null, fontFamily: null, light: DEFAULT_LIGHT_PALETTE, dark: DEFAULT_DARK_PALETTE };
export const DEFAULT_ACCESS: ApplicationDefaultAccess = { autoGrantOnSignup: false, tier: 'free', requiresApproval: false };
export const DEFAULT_COUNTRY_RESTRICTION: ApplicationCountryRestriction = { enabled: false, countries: [] };

@Schema({ collection: 'applications', timestamps: true, versionKey: false })
export class Application {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  key!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true })
  launchUrl!: string;

  /**
   * Where Grapifly redirects the browser with a one-time SSO code after
   * GET /auth/sso/:appKey — this app's own backend/frontend then exchanges
   * that code for an identity contract via POST /auth/sso/exchange. Null
   * until an admin configures it (or, for 'relay', until bootstrap seeds it
   * from RELAY_SSO_CALLBACK_URL — see ApplicationsService).
   */
  @Prop({ type: String, default: null })
  ssoCallbackUrl!: string | null;

  @Prop({ required: true, enum: ['first_party', 'third_party'], default: 'first_party' })
  ownership!: 'first_party' | 'third_party';

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active', index: true })
  status!: 'active' | 'inactive';

  @Prop({ required: true, min: 0, default: 0 })
  displayOrder!: number;

  /**
   * Per-app shared secret used for service-to-service calls into Grapifly
   * (identifying itself, validating internal/team endpoints). Hashed with
   * SHA-256 — never stored or returned in plaintext. Excluded from default
   * projections; callers that need to validate it must explicitly select it.
   */
  @Prop({ type: String, default: null, select: false })
  serviceSecretHash!: string | null;

  /**
   * Access rule evaluated once, when a new organization is created — decides
   * whether this app is granted automatically, and under what tier/approval
   * conditions. Read by the access-provisioning module, not enforced here.
   */
  @Prop({
    type: {
      autoGrantOnSignup: { type: Boolean, default: false },
      tier: { type: String, enum: ['trial', 'free', 'paid'], default: 'free' },
      requiresApproval: { type: Boolean, default: false },
    },
    _id: false,
    default: () => ({ autoGrantOnSignup: false, tier: 'free', requiresApproval: false }),
  })
  defaultAccess!: ApplicationDefaultAccess;

  /**
   * Canonical brand identity for this app — icon, logo (light/dark
   * variants), favicon, and a light/dark colour palette. Served live to
   * every app in the ecosystem via GET /app-config (see
   * ApplicationsService.getPublicConfig) — jtrade and Relay already render
   * it in their own frontends, not just in Grapifly's own catalogue cards.
   */
  @Prop({
    type: {
      icon: { type: String, default: '' },
      logoUrl: { type: String, default: null },
      logoUrlDark: { type: String, default: null },
      faviconUrl: { type: String, default: null },
      fontFamily: { type: String, default: null },
      light: {
        primaryColor: { type: String, default: DEFAULT_LIGHT_PALETTE.primaryColor },
        primaryContrastText: { type: String, default: DEFAULT_LIGHT_PALETTE.primaryContrastText },
        backgroundColor: { type: String, default: DEFAULT_LIGHT_PALETTE.backgroundColor },
        textColor: { type: String, default: DEFAULT_LIGHT_PALETTE.textColor },
      },
      dark: {
        primaryColor: { type: String, default: DEFAULT_DARK_PALETTE.primaryColor },
        primaryContrastText: { type: String, default: DEFAULT_DARK_PALETTE.primaryContrastText },
        backgroundColor: { type: String, default: DEFAULT_DARK_PALETTE.backgroundColor },
        textColor: { type: String, default: DEFAULT_DARK_PALETTE.textColor },
      },
    },
    _id: false,
    default: () => ({ icon: '', logoUrl: null, logoUrlDark: null, faviconUrl: null, fontFamily: null, light: DEFAULT_LIGHT_PALETTE, dark: DEFAULT_DARK_PALETTE }),
  })
  theme!: ApplicationTheme;

  /**
   * Optional allow-list of countries (ISO 3166-1 alpha-2) this app is
   * available in. `enabled: false` means unrestricted. Stored as data only —
   * not yet enforced anywhere (Organization.addressCountry isn't ISO-coded
   * yet, so there's nothing reliable to compare against).
   */
  @Prop({
    type: { enabled: { type: Boolean, default: false }, countries: { type: [String], default: [] } },
    _id: false,
    default: () => ({ enabled: false, countries: [] }),
  })
  countryRestriction!: ApplicationCountryRestriction;

  /**
   * Which of the three ecosystem flows this app is available to. Defaults to
   * all three (unrestricted, matching today's behaviour for every app).
   */
  @Prop({ type: [String], enum: ['client', 'provider', 'internal'], default: () => ['client', 'provider', 'internal'] })
  allowedFlows!: RoleFlow[];
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
