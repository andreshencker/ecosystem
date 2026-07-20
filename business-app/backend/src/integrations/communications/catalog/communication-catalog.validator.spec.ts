import {
  validateCatalog,
  assertCatalogValid,
} from './communication-catalog.validator';
import { COMMUNICATION_CATALOG } from './communication-catalog';
import type { UnifiedCatalog } from './communication-catalog.types';

const VALID_CATALOG: UnifiedCatalog = {
  version: 1,
  platform: [
    {
      domainKey: 'security',
      displayName: 'Security',
      domainCategory: 'system_notifications',
      isSystem: true,
      version: 1,
      events: [
        {
          eventKey: 'verify_email',
          displayName: 'Verify Email',
          description: 'Sends a verification link',
          eventType: 'security',
          channels: {
            email: {
              enabled: true,
              subject: 'Verify your email',
              content: '<p>Click here</p>',
              requiredVariables: ['data.firstName'],
              optionalVariables: [],
            },
          },
        },
      ],
    },
  ],
  business: [],
};

describe('validateCatalog', () => {
  it('passes for a valid catalog', () => {
    expect(validateCatalog(VALID_CATALOG)).toHaveLength(0);
  });

  it('fails when platform has duplicate domainKey', () => {
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      platform: [...VALID_CATALOG.platform, { ...VALID_CATALOG.platform[0] }],
    };
    const errors = validateCatalog(cat);
    expect(
      errors.some(
        (e) => e.includes('Duplicate domainKey') && e.includes('security'),
      ),
    ).toBe(true);
  });

  it('fails when business has duplicate domainKey', () => {
    const domain = {
      domainKey: 'billing',
      displayName: 'Billing',
      domainCategory: 'business_events',
      isSystem: false,
      version: 1,
      events: [],
    };
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      business: [domain, domain],
    };
    const errors = validateCatalog(cat);
    expect(
      errors.some(
        (e) => e.includes('Duplicate domainKey') && e.includes('billing'),
      ),
    ).toBe(true);
  });

  it('fails when canonicalKey is duplicated across platform and business', () => {
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      business: [
        {
          domainKey: 'security', // same as platform — creates duplicate canonicalKey
          displayName: 'Security',
          domainCategory: 'x',
          isSystem: false,
          version: 1,
          events: [
            {
              eventKey: 'verify_email', // duplicates security.verify_email
              displayName: 'V',
              description: 'd',
              eventType: 'security',
              channels: {
                email: {
                  enabled: false,
                  subject: '',
                  content: '',
                  requiredVariables: [],
                  optionalVariables: [],
                },
              },
            },
          ],
        },
      ],
    };
    const errors = validateCatalog(cat);
    expect(errors.some((e) => e.includes('Duplicate canonicalKey'))).toBe(true);
  });

  it('fails when email.enabled is true but subject is missing', () => {
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      platform: [
        {
          ...VALID_CATALOG.platform[0],
          events: [
            {
              ...VALID_CATALOG.platform[0].events[0],
              channels: {
                email: {
                  enabled: true,
                  subject: '', // empty — should fail
                  content: '<p>ok</p>',
                  requiredVariables: [],
                  optionalVariables: [],
                },
              },
            },
          ],
        },
      ],
    };
    const errors = validateCatalog(cat);
    expect(
      errors.some((e) => e.includes('subject required when enabled')),
    ).toBe(true);
  });

  it('fails when an event has no channel defined', () => {
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      platform: [
        {
          ...VALID_CATALOG.platform[0],
          events: [
            {
              eventKey: 'no_channel',
              displayName: 'No channel',
              description: 'desc',
              eventType: 'security',
              channels: {}, // no channels
            },
          ],
        },
      ],
    };
    const errors = validateCatalog(cat);
    expect(errors.some((e) => e.includes('at least one channel'))).toBe(true);
  });

  it('fails when domainKey contains invalid characters', () => {
    const cat: UnifiedCatalog = {
      ...VALID_CATALOG,
      platform: [
        {
          ...VALID_CATALOG.platform[0],
          domainKey: 'Bad-Key!',
        },
      ],
    };
    const errors = validateCatalog(cat);
    expect(errors.some((e) => e.includes('pattern'))).toBe(true);
  });
});

describe('assertCatalogValid', () => {
  it('does not throw for a valid catalog', () => {
    expect(() => assertCatalogValid(VALID_CATALOG)).not.toThrow();
  });

  it('throws for an invalid catalog', () => {
    const bad: UnifiedCatalog = {
      ...VALID_CATALOG,
      platform: [{ ...VALID_CATALOG.platform[0], domainKey: '' }],
    };
    expect(() => assertCatalogValid(bad)).toThrow(
      'COMMUNICATION_CATALOG is invalid',
    );
  });
});

describe('COMMUNICATION_CATALOG', () => {
  it('is itself valid', () => {
    expect(validateCatalog(COMMUNICATION_CATALOG)).toHaveLength(0);
  });

  it('has platform section with at least one domain', () => {
    expect(COMMUNICATION_CATALOG.platform.length).toBeGreaterThan(0);
  });

  it('contains the security domain in platform', () => {
    const security = COMMUNICATION_CATALOG.platform.find(
      (d) => d.domainKey === 'security',
    );
    expect(security).toBeDefined();
  });

  it('contains company_verify_email in security domain', () => {
    const security = COMMUNICATION_CATALOG.platform.find(
      (d) => d.domainKey === 'security',
    )!;
    const event = security.events.find(
      (e) => e.eventKey === 'company_verify_email',
    );
    expect(event).toBeDefined();
    expect(event!.channels.email?.enabled).toBe(true);
    expect(event!.channels.email?.requiredVariables).toContain(
      'data.verificationUrl',
    );
  });
});
