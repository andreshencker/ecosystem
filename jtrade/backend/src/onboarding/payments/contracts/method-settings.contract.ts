/**
 * A method folder implements this so the admin page can render its settings
 * form dynamically and jtrade can validate what the admin saves. Kept separate
 * from `MethodOnboarding` — a method could be configurable before its runtime
 * flow exists.
 */
export interface MethodConfigurable {
  readonly method: string;

  /** Field definitions for the admin settings form. */
  settingsFields(): SettingsFieldDef[];

  /**
   * Validate + normalise an admin-submitted settings object.
   * Throws `BadRequestException` with a clear message when something is wrong.
   */
  validateSettings(raw: Record<string, unknown>): Record<string, unknown>;

  /**
   * Given the saved settings and an optional provider choice, decide the
   * country to send to the gateway. Throws when the provider must choose and
   * didn't, or chose something not allowed.
   */
  resolveCountry(
    settings: Record<string, unknown>,
    providerChoice?: string,
  ): string;
}

export type SettingsFieldType = 'string' | 'number' | 'country-list';

export interface SettingsFieldDef {
  key: string;
  label: string;
  type: SettingsFieldType;
  required: boolean;
  help?: string;
}
