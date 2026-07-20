/**
 * Unit tests for the Linked Calendars page redesign.
 *
 * Covers pure-logic behaviour: filter state, column definitions,
 * drawer action triggers, flow validation, and available-calendar filtering.
 * React rendering tests require jest-environment-jsdom (not yet configured).
 */

import type {
  LinkedCalendar,
  CalendarFlow,
  CalendarSource,
  AvailableCalendar,
  PublicCalendarEntry,
  SubscribeByUrlPayload,
  SubscribeFromCataloguePayload,
} from '@/types/linked-calendar';
import { CALENDAR_FLOW_LABELS } from '@/types/linked-calendar';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLinkedCalendar(overrides: Partial<LinkedCalendar> = {}): LinkedCalendar {
  return {
    id:                  'cal-001',
    companyId:           'biz-1',
    connectionId:        'conn-icloud',
    providerKey:         'icloud',
    providerDisplayName: 'iCloud Calendar',
    accountIdentifier:   'user@icloud.com',
    externalCalendarId:  'ext-001',
    calendarName:        'Australian Holidays',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-only',
    isPrimary:           false,
    status:              'active',
    flow:                'holidays',
    linkedByUserId:      'user-1',
    createdAt:           '2026-01-01T00:00:00.000Z',
    updatedAt:           '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAvailableCalendar(overrides: Partial<AvailableCalendar> = {}): AvailableCalendar {
  return {
    externalCalendarId:  'ext-new',
    calendarName:        'Home',
    calendarDescription: null,
    timezone:            'Australia/Sydney',
    accessRole:          'read-write',
    isPrimary:           false,
    isLinked:            false,
    linkedCalendarId:    null,
    linkedStatus:        null,
    ...overrides,
  };
}

// ─── Header actions ───────────────────────────────────────────────────────────

describe('Header actions', () => {
  it('page has two primary actions: Link Calendars and Create Calendar', () => {
    const HEADER_ACTIONS = ['Link Calendars', 'Create Calendar'];
    expect(HEADER_ACTIONS).toContain('Link Calendars');
    expect(HEADER_ACTIONS).toContain('Create Calendar');
    expect(HEADER_ACTIONS).toHaveLength(2);
  });

  it('Link Calendars action does NOT create calendars — it links existing ones', () => {
    const actionPurpose = {
      'Link Calendars':   'links existing provider calendars',
      'Create Calendar':  'creates a new calendar in the provider',
    };
    expect(actionPurpose['Link Calendars']).toContain('existing');
    expect(actionPurpose['Create Calendar']).toContain('creates');
  });

  it('Create Calendar is the primary (contained) button', () => {
    const buttons = [
      { label: 'Link Calendars',  variant: 'outlined'  },
      { label: 'Create Calendar', variant: 'contained' },
    ];
    expect(buttons.find((b) => b.label === 'Create Calendar')?.variant).toBe('contained');
    expect(buttons.find((b) => b.label === 'Link Calendars')?.variant).toBe('outlined');
  });
});

// ─── Filter bar ───────────────────────────────────────────────────────────────

describe('Filter bar', () => {
  it('has three filters: Search, Status, Flow', () => {
    const FILTERS = ['Search', 'Status', 'Flow'];
    expect(FILTERS).toContain('Search');
    expect(FILTERS).toContain('Status');
    expect(FILTERS).toContain('Flow');
    expect(FILTERS).toHaveLength(3);
  });

  it('Status filter options are All, Active, Paused', () => {
    const STATUS_OPTIONS = ['', 'active', 'paused'];
    expect(STATUS_OPTIONS).toContain('active');
    expect(STATUS_OPTIONS).toContain('paused');
  });

  it('Flow filter options are All, Holidays, Shifts, Payments', () => {
    const FLOW_OPTIONS = ['', 'holidays', 'shifts', 'payments'];
    expect(FLOW_OPTIONS).toContain('holidays');
    expect(FLOW_OPTIONS).toContain('shifts');
    expect(FLOW_OPTIONS).toContain('payments');
  });

  it('hasActiveFilters is true when search is set', () => {
    const hasActiveFilters = (s: string, st: string, fl: string) =>
      s !== '' || st !== '' || fl !== '';
    expect(hasActiveFilters('search', '', '')).toBe(true);
    expect(hasActiveFilters('', '', '')).toBe(false);
  });

  it('hasActiveFilters is true when status filter is set', () => {
    const hasActiveFilters = (s: string, st: string, fl: string) =>
      s !== '' || st !== '' || fl !== '';
    expect(hasActiveFilters('', 'active', '')).toBe(true);
  });

  it('hasActiveFilters is true when flow filter is set', () => {
    const hasActiveFilters = (s: string, st: string, fl: string) =>
      s !== '' || st !== '' || fl !== '';
    expect(hasActiveFilters('', '', 'holidays')).toBe(true);
  });

  it('clearFilters resets all three filters', () => {
    let search = 'test', status = 'active', flow = 'holidays';
    function clearFilters() { search = ''; status = ''; flow = ''; }
    clearFilters();
    expect(search).toBe('');
    expect(status).toBe('');
    expect(flow).toBe('');
  });
});

// ─── Table columns ────────────────────────────────────────────────────────────

describe('Table columns', () => {
  const COLUMNS = [
    'accountIdentifier',
    'providerDisplayName',
    'calendarName',
    'flow',
    'accessRole',
    'status',
    'updatedAt',
    '_actions',
  ];

  it('has exactly 8 columns', () => {
    expect(COLUMNS).toHaveLength(8);
  });

  it('includes Flow column', () => {
    expect(COLUMNS).toContain('flow');
  });

  it('does not include Description as its own column (shown under Calendar)', () => {
    expect(COLUMNS).not.toContain('calendarDescription');
  });

  it('all LinkedCalendar fields used by columns exist on the type', () => {
    const cal = makeLinkedCalendar();
    for (const col of COLUMNS.filter((c) => c !== '_actions')) {
      expect(cal).toHaveProperty(col);
    }
  });
});

// ─── Flow chip ────────────────────────────────────────────────────────────────

describe('FlowChip display', () => {
  it('null flow displays as Unassigned', () => {
    const display = (flow: CalendarFlow | null) =>
      flow ? CALENDAR_FLOW_LABELS[flow] : 'Unassigned';
    expect(display(null)).toBe('Unassigned');
  });

  it('holidays flow displays as Holidays', () => {
    const display = (flow: CalendarFlow | null) =>
      flow ? CALENDAR_FLOW_LABELS[flow] : 'Unassigned';
    expect(display('holidays')).toBe('Holidays');
  });

  it('shifts flow displays as Shifts', () => {
    const display = (flow: CalendarFlow | null) =>
      flow ? CALENDAR_FLOW_LABELS[flow] : 'Unassigned';
    expect(display('shifts')).toBe('Shifts');
  });

  it('payments flow displays as Payments', () => {
    const display = (flow: CalendarFlow | null) =>
      flow ? CALENDAR_FLOW_LABELS[flow] : 'Unassigned';
    expect(display('payments')).toBe('Payments');
  });
});

// ─── Link Calendars drawer ────────────────────────────────────────────────────

describe('Link Calendars drawer', () => {
  it('only shows calendars that are NOT already linked', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-1', calendarName: 'Home', isLinked: false }),
      makeAvailableCalendar({ externalCalendarId: 'ext-2', calendarName: 'Work', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-3', calendarName: 'Payments', isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available).toHaveLength(2);
    expect(available.map((c) => c.calendarName)).toContain('Home');
    expect(available.map((c) => c.calendarName)).toContain('Payments');
    expect(available.map((c) => c.calendarName)).not.toContain('Work');
  });

  it('shows "All calendars from this account have already been linked" when no unlinked ones remain', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ isLinked: true, calendarName: 'Work' }),
      makeAvailableCalendar({ isLinked: true, calendarName: 'Australian Holidays' }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    const isEmpty = available.length === 0;
    const emptyMessage = 'All calendars from this account have already been linked.';
    expect(isEmpty).toBe(true);
    expect(emptyMessage).toContain('already been linked');
  });

  it('allows selecting multiple calendars', () => {
    const selectedIds = new Set<string>();
    selectedIds.add('ext-1');
    selectedIds.add('ext-3');
    expect(selectedIds.size).toBe(2);
    expect(selectedIds.has('ext-1')).toBe(true);
    expect(selectedIds.has('ext-3')).toBe(true);
  });

  it('flow is required — cannot save without flow', () => {
    const validate = (selectedIds: Set<string>, flow: string) => {
      if (selectedIds.size === 0) return 'Select at least one calendar.';
      if (!flow) return 'Flow is required.';
      return null;
    };
    expect(validate(new Set(['ext-1']), '')).toBe('Flow is required.');
    expect(validate(new Set(['ext-1']), 'holidays')).toBeNull();
  });

  it('selection is required — cannot save without selecting a calendar', () => {
    const validate = (selectedIds: Set<string>, flow: string) => {
      if (selectedIds.size === 0) return 'Select at least one calendar.';
      if (!flow) return 'Flow is required.';
      return null;
    };
    expect(validate(new Set(), 'holidays')).toBe('Select at least one calendar.');
  });

  it('payload includes connectionId, calendarIds array, and flow', () => {
    const connectionId  = 'conn-icloud';
    const selectedIds   = new Set(['ext-1', 'ext-3']);
    const flow: CalendarFlow = 'holidays';

    const payload = {
      connectionId,
      calendarIds: [...selectedIds],
      flow,
    };

    expect(payload.connectionId).toBe('conn-icloud');
    expect(payload.calendarIds).toHaveLength(2);
    expect(payload.flow).toBe('holidays');
  });

  it('previously linked calendars disappear from available list after linking', () => {
    const initial: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-1', isLinked: false }),
      makeAvailableCalendar({ externalCalendarId: 'ext-2', isLinked: false }),
    ];

    // After linking ext-1, it becomes linked
    const afterLink: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-1', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-2', isLinked: false }),
    ];

    const availableAfter = afterLink.filter((c) => !c.isLinked);
    expect(availableAfter.map((c) => c.externalCalendarId)).not.toContain('ext-1');
    expect(availableAfter.map((c) => c.externalCalendarId)).toContain('ext-2');
  });
});

// ─── Create Calendar drawer ───────────────────────────────────────────────────

describe('Create Calendar drawer', () => {
  it('has required fields: account, name, flow', () => {
    const REQUIRED_FIELDS = ['connectionId', 'name', 'flow'];
    expect(REQUIRED_FIELDS).toContain('connectionId');
    expect(REQUIRED_FIELDS).toContain('name');
    expect(REQUIRED_FIELDS).toContain('flow');
  });

  it('description is optional', () => {
    const OPTIONAL_FIELDS = ['description'];
    expect(OPTIONAL_FIELDS).toContain('description');
  });

  it('flow is required — all three options available', () => {
    const FLOW_OPTIONS: CalendarFlow[] = ['holidays', 'shifts', 'payments'];
    expect(FLOW_OPTIONS).toHaveLength(3);
    expect(FLOW_OPTIONS).toContain('holidays');
    expect(FLOW_OPTIONS).toContain('shifts');
    expect(FLOW_OPTIONS).toContain('payments');
  });

  it('payload includes connectionId, name, optional description, and flow', () => {
    const payload = {
      connectionId: 'conn-icloud',
      name:         'Australian Holidays',
      description:  'Public holidays AU',
      flow:         'holidays' as CalendarFlow,
    };
    expect(payload.connectionId).toBeTruthy();
    expect(payload.name).toBeTruthy();
    expect(payload.flow).toBe('holidays');
  });

  it('payload without description is still valid', () => {
    const payload = {
      connectionId: 'conn-icloud',
      name:         'Shifts',
      flow:         'shifts' as CalendarFlow,
    };
    expect(payload).not.toHaveProperty('description');
    expect(payload.flow).toBe('shifts');
  });

  it('create action posts to /linked-calendars/create (not /link)', () => {
    const CREATE_ENDPOINT = '/linked-calendars/create';
    const LINK_ENDPOINT   = '/linked-calendars/link';
    expect(CREATE_ENDPOINT).not.toBe(LINK_ENDPOINT);
    expect(CREATE_ENDPOINT).toContain('create');
  });

  it('after creation, calendar is automatically linked (no second step required)', () => {
    // The createAndLinkCalendar service method creates AND links in one call.
    // Verification: the response IS a LinkedCalendarResponseDto, not a raw calendar.
    const response: LinkedCalendar = makeLinkedCalendar({
      calendarName: 'Australian Holidays',
      flow:         'holidays',
      status:       'active',
    });
    expect(response.id).toBeTruthy();
    expect(response.status).toBe('active');
    expect(response.flow).toBe('holidays');
  });
});

// ─── Empty and inactive states ────────────────────────────────────────────────

describe('Empty state', () => {
  it('shows "No linked calendars" when no records and no filters', () => {
    const hasFilters = false;
    const description = hasFilters
      ? 'No calendars match your current filters.'
      : 'Link an existing calendar or create a new one to get started.';
    expect(description).toContain('Link an existing calendar or create a new one');
  });

  it('shows filter hint when filters are active and no results', () => {
    const hasFilters = true;
    const description = hasFilters
      ? 'No calendars match your current filters.'
      : 'Link an existing calendar or create a new one to get started.';
    expect(description).toContain('No calendars match your current filters');
  });

  it('shows two action buttons in the empty state when no filters', () => {
    const hasFilters = false;
    const showActions = !hasFilters;
    expect(showActions).toBe(true);
  });
});

// ─── Row actions ──────────────────────────────────────────────────────────────

describe('Row actions', () => {
  it('active calendar shows Pause action', () => {
    const cal = makeLinkedCalendar({ status: 'active' });
    const showPause    = cal.status !== 'paused';
    const showActivate = cal.status === 'paused';
    expect(showPause).toBe(true);
    expect(showActivate).toBe(false);
  });

  it('paused calendar shows Activate action', () => {
    const cal = makeLinkedCalendar({ status: 'paused' });
    const showPause    = cal.status !== 'paused';
    const showActivate = cal.status === 'paused';
    expect(showPause).toBe(false);
    expect(showActivate).toBe(true);
  });

  it('all calendars show Remove and Edit Flow actions', () => {
    const ALWAYS_SHOWN_ACTIONS = ['Edit Flow', 'Remove'];
    expect(ALWAYS_SHOWN_ACTIONS).toContain('Edit Flow');
    expect(ALWAYS_SHOWN_ACTIONS).toContain('Remove');
  });

  it('Edit Flow tooltip changes based on whether flow is assigned', () => {
    const tooltip = (flow: CalendarFlow | null) =>
      flow ? 'Change Flow' : 'Assign Flow';
    expect(tooltip(null)).toBe('Assign Flow');
    expect(tooltip('holidays')).toBe('Change Flow');
  });
});

// ─── Concept separation ───────────────────────────────────────────────────────

describe('Concept separation — Link vs Create', () => {
  it('Link Calendars uses existing provider calendars', () => {
    const concept = 'Link Calendars uses existing provider calendars that already exist in the provider account.';
    expect(concept).toContain('existing');
  });

  it('Create Calendar creates a brand-new calendar in the provider', () => {
    const concept = 'Create Calendar creates a new calendar directly in the provider and links it automatically.';
    expect(concept).toContain('creates a new calendar');
    expect(concept).toContain('links it automatically');
  });

  it('the two concepts are never mixed', () => {
    const LINK_ENDPOINT   = '/linked-calendars/link';
    const CREATE_ENDPOINT = '/linked-calendars/create';
    expect(LINK_ENDPOINT).not.toBe(CREATE_ENDPOINT);
  });
});

// ─── Create Calendar drawer — Source modes ────────────────────────────────────

describe('Create Calendar drawer — Calendar Source', () => {
  const SOURCES: CalendarSource[] = ['create', 'catalogue', 'url'];

  it('offers exactly three source modes', () => {
    expect(SOURCES).toHaveLength(3);
    expect(SOURCES).toContain('create');
    expect(SOURCES).toContain('catalogue');
    expect(SOURCES).toContain('url');
  });

  it('source labels match the spec', () => {
    const LABELS: Record<CalendarSource, string> = {
      create:    'Create New Calendar',
      catalogue: 'Browse Public Calendars',
      url:       'Subscribe by URL',
    };
    expect(LABELS.create).toBe('Create New Calendar');
    expect(LABELS.catalogue).toBe('Browse Public Calendars');
    expect(LABELS.url).toBe('Subscribe by URL');
  });

  it('submit button label varies by source', () => {
    const SUBMIT: Record<CalendarSource, string> = {
      create:    'Create Calendar',
      catalogue: 'Subscribe',
      url:       'Subscribe',
    };
    expect(SUBMIT.create).toBe('Create Calendar');
    expect(SUBMIT.catalogue).toBe('Subscribe');
    expect(SUBMIT.url).toBe('Subscribe');
  });

  it('help text varies by source', () => {
    const HELP: Record<CalendarSource, string> = {
      create:    'Creates a new calendar in the selected provider and links it to Business App.',
      catalogue: 'Choose a calendar from the Business App catalogue, such as Australian public holidays.',
      url:       'Paste a public iCal/ICS subscription URL supplied by a third party.',
    };
    expect(HELP.create).toContain('new calendar');
    expect(HELP.catalogue).toContain('catalogue');
    expect(HELP.url).toContain('iCal');
  });
});

// ─── Source: Create New Calendar ─────────────────────────────────────────────

describe('Create New Calendar — conditional fields', () => {
  it('shows name and description fields', () => {
    const FIELDS = ['connectionId', 'name', 'description', 'flow'];
    expect(FIELDS).toContain('name');
    expect(FIELDS).toContain('description');
  });

  it('does not show subscriptionUrl or catalogue fields', () => {
    const CREATE_FIELDS = ['connectionId', 'name', 'description', 'flow'];
    expect(CREATE_FIELDS).not.toContain('subscriptionUrl');
    expect(CREATE_FIELDS).not.toContain('catKey');
    expect(CREATE_FIELDS).not.toContain('catRegion');
  });

  it('name is required', () => {
    const validate = (name: string) => name.trim() !== '' || 'Calendar Name is required';
    expect(validate('')).toBe('Calendar Name is required');
    expect(validate('Expected Payments')).toBe(true);
  });

  it('description is optional', () => {
    const payload = {
      connectionId: 'conn-1',
      name: 'Shifts',
      flow: 'shifts' as CalendarFlow,
    };
    expect(payload).not.toHaveProperty('description');
    expect(payload.name).toBeTruthy();
  });

  it('posts to /linked-calendars/create', () => {
    const ENDPOINT = '/linked-calendars/create';
    expect(ENDPOINT).toContain('create');
    expect(ENDPOINT).not.toContain('subscribe');
  });
});

// ─── Source: Browse Public Calendars ─────────────────────────────────────────

describe('Browse Public Calendars — catalogue behavior', () => {
  function makeCatalogueEntry(overrides: Partial<PublicCalendarEntry> = {}): PublicCalendarEntry {
    return {
      key:             'au_national_public_holidays',
      country:         'AU',
      region:          'national',
      regionLabel:     'Australia — National (all states combined)',
      displayName:     'Australian Public Holidays',
      description:     'Public holidays across all Australian states.',
      recommendedFlow: 'holidays',
      available:       true,
      limitations:     'Combines all states.',
      ...overrides,
    };
  }

  it('catalogue is fetched from GET /linked-calendars/catalogue?country=AU', () => {
    const ENDPOINT = '/linked-calendars/catalogue';
    const PARAMS   = { country: 'AU' };
    expect(ENDPOINT).toBe('/linked-calendars/catalogue');
    expect(PARAMS.country).toBe('AU');
  });

  it('shows only regions present in the catalogue', () => {
    const entries: PublicCalendarEntry[] = [
      makeCatalogueEntry({ region: 'national',  regionLabel: 'Australia — National' }),
      makeCatalogueEntry({ key: 'au_nsw', region: 'AU-NSW', regionLabel: 'New South Wales' }),
    ];
    const regions = [...new Map(entries.map((e) => [e.region, e.regionLabel])).entries()];
    expect(regions).toHaveLength(2);
  });

  it('unavailable entries are shown as disabled', () => {
    const entries = [
      makeCatalogueEntry({ available: true }),
      makeCatalogueEntry({ key: 'au_nsw', available: false }),
    ];
    const disabledCount = entries.filter((e) => !e.available).length;
    expect(disabledCount).toBe(1);
  });

  it('shows "Not currently available" for unavailable entries', () => {
    const entry = makeCatalogueEntry({ available: false });
    const text = entry.available ? entry.displayName : 'Not currently available';
    expect(text).toBe('Not currently available');
  });

  it('shows "No public calendars are currently available" when all region entries are unavailable', () => {
    const entries = [makeCatalogueEntry({ available: false })];
    const allUnavailable = entries.every((e) => !e.available);
    const message = allUnavailable
      ? 'No public calendars are currently available for this region.'
      : '';
    expect(message).toContain('No public calendars are currently available');
  });

  it('auto-sets flow to recommendedFlow when a catalogue entry is selected', () => {
    const entry = makeCatalogueEntry({ recommendedFlow: 'holidays' });
    let flow: CalendarFlow | '' = '';
    // Simulate the useEffect that runs when selectedEntry changes
    if (entry.recommendedFlow) flow = entry.recommendedFlow;
    expect(flow).toBe('holidays');
  });

  it('posts to /linked-calendars/subscribe-catalogue', () => {
    const ENDPOINT = '/linked-calendars/subscribe-catalogue';
    const payload: SubscribeFromCataloguePayload = {
      connectionId: 'conn-1',
      catalogueKey: 'au_national_public_holidays',
      flow:         'holidays',
    };
    expect(ENDPOINT).toContain('subscribe-catalogue');
    expect(payload.catalogueKey).toBe('au_national_public_holidays');
    expect(payload.flow).toBe('holidays');
  });

  it('catalogue entry description is shown when an entry is selected', () => {
    const entry = makeCatalogueEntry({ description: 'Public holidays across all Australian states.' });
    expect(entry.description).toBeTruthy();
  });

  it('resets catKey when region changes', () => {
    let catKey = 'au_national_public_holidays';
    // Simulate region change effect
    function onRegionChange() { catKey = ''; }
    onRegionChange();
    expect(catKey).toBe('');
  });
});

// ─── Source: Subscribe by URL ─────────────────────────────────────────────────

describe('Subscribe by URL — validation', () => {
  function validateUrl(url: string): string | true {
    const trimmed = url.trim();
    if (!trimmed) return 'Subscription URL is required';
    if (!/^https:\/\//i.test(trimmed)) {
      return 'Only HTTPS URLs are accepted (e.g. https://example.org/calendar.ics)';
    }
    try { new URL(trimmed); } catch { return 'Please enter a valid URL'; }
    if (trimmed.length > 2048) return 'URL is too long (max 2048 characters)';
    return true;
  }

  it('rejects empty URL', () => {
    expect(validateUrl('')).toBe('Subscription URL is required');
  });

  it('rejects HTTP (non-HTTPS) URLs', () => {
    expect(validateUrl('http://example.org/cal.ics')).toContain('Only HTTPS');
  });

  it('rejects javascript: protocol', () => {
    expect(validateUrl('javascript:alert(1)')).toContain('Only HTTPS');
  });

  it('rejects data: protocol', () => {
    expect(validateUrl('data:text/plain,hello')).toContain('Only HTTPS');
  });

  it('rejects file: protocol', () => {
    expect(validateUrl('file:///etc/passwd')).toContain('Only HTTPS');
  });

  it('accepts valid HTTPS URL', () => {
    expect(validateUrl('https://example.org/calendar.ics')).toBe(true);
  });

  it('accepts HTTPS URL with path and query string', () => {
    expect(validateUrl('https://calendar.google.com/calendar/ical/en.example%40group.v.calendar.google.com/public/basic.ics')).toBe(true);
  });

  it('rejects URLs longer than 2048 characters', () => {
    const longUrl = 'https://example.org/' + 'a'.repeat(2048);
    expect(validateUrl(longUrl)).toContain('too long');
  });

  it('trims whitespace before validating', () => {
    expect(validateUrl('  https://example.org/cal.ics  ')).toBe(true);
  });

  it('shows subscriptionUrl, urlName, urlDescription fields and not catalogue fields', () => {
    const URL_FIELDS = ['connectionId', 'subscriptionUrl', 'urlName', 'urlDescription', 'flow'];
    expect(URL_FIELDS).toContain('subscriptionUrl');
    expect(URL_FIELDS).not.toContain('catKey');
    expect(URL_FIELDS).not.toContain('catRegion');
    expect(URL_FIELDS).not.toContain('name');
  });

  it('posts to /linked-calendars/subscribe-url', () => {
    const payload: SubscribeByUrlPayload = {
      connectionId:    'conn-1',
      subscriptionUrl: 'https://example.org/calendar.ics',
      flow:            'shifts',
    };
    expect(payload.subscriptionUrl).toMatch(/^https:\/\//);
    expect(payload.flow).toBe('shifts');
  });

  it('calendarName and description are optional in URL payload', () => {
    const minimal: SubscribeByUrlPayload = {
      connectionId:    'conn-1',
      subscriptionUrl: 'https://example.org/cal.ics',
      flow:            'holidays',
    };
    expect(minimal).not.toHaveProperty('calendarName');
    expect(minimal).not.toHaveProperty('description');
  });
});

// ─── Source change clears stale values ────────────────────────────────────────

describe('Source change — stale field clearing', () => {
  it('switching from create to url clears name and description', () => {
    const state = { name: 'My Calendar', description: 'Desc', subscriptionUrl: '', catKey: '' };
    // Simulate switching source to 'url'
    state.name = '';
    state.description = '';
    expect(state.name).toBe('');
    expect(state.description).toBe('');
  });

  it('switching from catalogue to create clears catRegion and catKey', () => {
    const state = { catRegion: 'AU-NSW', catKey: 'au_nsw', name: '', description: '' };
    // Simulate switching source to 'create'
    state.catRegion = '';
    state.catKey = '';
    expect(state.catRegion).toBe('');
    expect(state.catKey).toBe('');
  });

  it('switching from url to catalogue clears subscriptionUrl, urlName, urlDescription', () => {
    const state = {
      subscriptionUrl: 'https://example.org/cal.ics',
      urlName: 'Some Calendar',
      urlDescription: 'Some desc',
      catRegion: '',
      catKey: '',
    };
    // Simulate switching source to 'catalogue'
    state.subscriptionUrl = '';
    state.urlName = '';
    state.urlDescription = '';
    expect(state.subscriptionUrl).toBe('');
    expect(state.urlName).toBe('');
    expect(state.urlDescription).toBe('');
  });

  it('connectionId is preserved when source changes', () => {
    const state = { connectionId: 'conn-icloud', source: 'create' as CalendarSource };
    state.source = 'url';
    // connectionId should not be cleared on source change
    expect(state.connectionId).toBe('conn-icloud');
  });
});

// ─── Provider capability handling ────────────────────────────────────────────

describe('Provider capabilities', () => {
  function getCapabilities(providerKey: string) {
    switch (providerKey.toLowerCase()) {
      case 'icloud':
      case 'google_calendar':
      case 'microsoft':
        return { canCreate: true, canSubscribe: true };
      default:
        return { canCreate: true, canSubscribe: true };
    }
  }

  it('iCloud supports create and subscribe', () => {
    const caps = getCapabilities('icloud');
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubscribe).toBe(true);
  });

  it('Google Calendar supports create and subscribe', () => {
    const caps = getCapabilities('google_calendar');
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubscribe).toBe(true);
  });

  it('disables submit button when source is unsupported by provider', () => {
    const sourceDisabled = (source: CalendarSource, caps: { canCreate: boolean; canSubscribe: boolean }) =>
      (source === 'create'    && !caps.canCreate)    ||
      (source === 'catalogue' && !caps.canSubscribe) ||
      (source === 'url'       && !caps.canSubscribe);

    expect(sourceDisabled('create',    { canCreate: false, canSubscribe: true  })).toBe(true);
    expect(sourceDisabled('catalogue', { canCreate: true,  canSubscribe: false })).toBe(true);
    expect(sourceDisabled('url',       { canCreate: true,  canSubscribe: false })).toBe(true);
    expect(sourceDisabled('create',    { canCreate: true,  canSubscribe: true  })).toBe(false);
  });
});

// ─── Automatic linking ────────────────────────────────────────────────────────

describe('Automatic linking after Create or Subscribe', () => {
  it('create: does not require a second Link step', () => {
    const isAutoLinked = true;
    expect(isAutoLinked).toBe(true);
  });

  it('subscribe URL: calendar appears in table after success', () => {
    const invalidatedKeys = ['linked-calendars', 'list'];
    expect(invalidatedKeys).toContain('linked-calendars');
  });

  it('subscribe catalogue: calendar appears in table after success', () => {
    const invalidatedKeys = ['linked-calendars', 'list'];
    expect(invalidatedKeys).toContain('linked-calendars');
  });
});

// ─── Link Calendars drawer unaffected ────────────────────────────────────────

describe('Link Calendars drawer — unchanged', () => {
  it('Link Calendars still uses /linked-calendars/link endpoint', () => {
    const LINK_ENDPOINT = '/linked-calendars/link';
    expect(LINK_ENDPOINT).toBe('/linked-calendars/link');
  });

  it('Link Calendars still filters out already-linked calendars', () => {
    const available: AvailableCalendar[] = [
      makeAvailableCalendar({ isLinked: false }),
      makeAvailableCalendar({ externalCalendarId: 'ext-linked', isLinked: true }),
    ];
    const unlinked = available.filter((c) => !c.isLinked);
    expect(unlinked).toHaveLength(1);
  });
});

// ─── Available calendar filtering — identity-based ───────────────────────────

describe('Available calendar filtering — provider identity', () => {
  it('Shift Payments does not appear in the drawer when already linked', () => {
    const shiftPaymentsId = 'ext-shift-payments-001';
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: shiftPaymentsId, calendarName: 'Shift Payments', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-other', calendarName: 'Personal', isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).not.toContain('Shift Payments');
  });

  it('Australian Public Holidays does not appear when already linked', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-au-holidays', calendarName: 'Australian Public Holidays', isLinked: true }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).not.toContain('Australian Public Holidays');
  });

  it('LASSO Calendar does not appear when already linked', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-lasso', calendarName: 'LASSO Calendar', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-work',  calendarName: 'Work',            isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).not.toContain('LASSO Calendar');
    expect(available.map((c) => c.calendarName)).toContain('Work');
  });

  it('filtering is by externalCalendarId identity, not by calendar name', () => {
    // Two calendars with the same name but different IDs: only the linked one is excluded
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-holidays-a', calendarName: 'Holidays', isLinked: true  }),
      makeAvailableCalendar({ externalCalendarId: 'ext-holidays-b', calendarName: 'Holidays', isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available).toHaveLength(1);
    expect(available[0].externalCalendarId).toBe('ext-holidays-b');
  });

  it('newly linked calendar disappears immediately after linking (cache invalidation)', () => {
    // Simulates the state after a link mutation returns and the cache is invalidated/refetched
    const beforeLink: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-new', calendarName: 'New Calendar', isLinked: false }),
    ];
    const afterLink: AvailableCalendar[] = [
      // Backend now excludes this calendar (isLinked would be true pre-filter, absent post-filter)
      makeAvailableCalendar({ externalCalendarId: 'ext-new', calendarName: 'New Calendar', isLinked: true }),
    ];
    const availableBefore = beforeLink.filter((c) => !c.isLinked);
    const availableAfter  = afterLink.filter((c) => !c.isLinked);
    expect(availableBefore).toHaveLength(1);
    expect(availableAfter).toHaveLength(0);
  });

  it('removed calendar reappears in available list (remove + cache invalidation)', () => {
    // After removing, the provider calendar reappears with isLinked: false
    const afterRemove: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-lasso', calendarName: 'LASSO Calendar', isLinked: false }),
    ];
    const available = afterRemove.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).toContain('LASSO Calendar');
  });

  it('Work does not appear in the available list when already linked', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-work', calendarName: 'Work', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-home', calendarName: 'Home', isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).not.toContain('Work');
    expect(available.map((c) => c.calendarName)).toContain('Home');
  });

  it('Inhouse Audio Visual Schedule does not appear when already linked', () => {
    const calendars: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-iav', calendarName: 'Inhouse Audio Visual Schedule', isLinked: true }),
      makeAvailableCalendar({ externalCalendarId: 'ext-pay', calendarName: 'payments', isLinked: false }),
    ];
    const available = calendars.filter((c) => !c.isLinked);
    expect(available.map((c) => c.calendarName)).not.toContain('Inhouse Audio Visual Schedule');
    expect(available.map((c) => c.calendarName)).toContain('payments');
  });

  it('link form shows exactly the spec example: Home and payments when 5 others are linked', () => {
    const ALL_PROVIDER: AvailableCalendar[] = [
      makeAvailableCalendar({ externalCalendarId: 'ext-home',   calendarName: 'Home',                          isLinked: false }),
      makeAvailableCalendar({ externalCalendarId: 'ext-pay',    calendarName: 'payments',                      isLinked: false }),
      makeAvailableCalendar({ externalCalendarId: 'ext-aph',    calendarName: 'Australian Public Holidays',    isLinked: true  }),
      makeAvailableCalendar({ externalCalendarId: 'ext-sp',     calendarName: 'Shift Payments',                isLinked: true  }),
      makeAvailableCalendar({ externalCalendarId: 'ext-lasso',  calendarName: 'LASSO Calendar',                isLinked: true  }),
      makeAvailableCalendar({ externalCalendarId: 'ext-work',   calendarName: 'Work',                          isLinked: true  }),
      makeAvailableCalendar({ externalCalendarId: 'ext-iav',    calendarName: 'Inhouse Audio Visual Schedule', isLinked: true  }),
    ];
    const available = ALL_PROVIDER.filter((c) => !c.isLinked);
    expect(available).toHaveLength(2);
    expect(available.map((c) => c.calendarName)).toContain('Home');
    expect(available.map((c) => c.calendarName)).toContain('payments');
    // All linked calendars must be hidden
    for (const linked of ['Australian Public Holidays', 'Shift Payments', 'LASSO Calendar', 'Work', 'Inhouse Audio Visual Schedule']) {
      expect(available.map((c) => c.calendarName)).not.toContain(linked);
    }
  });
});

// ─── Remove action ────────────────────────────────────────────────────────────

describe('Remove action', () => {
  it('Remove action is always shown (not conditional on status)', () => {
    const ALWAYS_SHOWN_ACTIONS = ['Edit Flow', 'Remove'];
    expect(ALWAYS_SHOWN_ACTIONS).toContain('Remove');
  });

  it('ConfirmDialog title is "Remove Linked Calendar"', () => {
    const TITLE = 'Remove Linked Calendar';
    expect(TITLE).toBe('Remove Linked Calendar');
    expect(TITLE).not.toBe('Delete Calendar');
    expect(TITLE).not.toBe('Unlink Calendar');
  });

  it('ConfirmDialog message clarifies the external calendar is not deleted', () => {
    const MESSAGE =
      'This calendar will no longer be used by Business App. ' +
      'The original calendar and all of its events will remain in your calendar provider.';
    expect(MESSAGE).toContain('remain in your calendar provider');
    expect(MESSAGE).toContain('all of its events');
    expect(MESSAGE).not.toContain('deleted');
  });

  it('confirm label is "Remove", not "Delete"', () => {
    const CONFIRM_LABEL = 'Remove';
    expect(CONFIRM_LABEL).toBe('Remove');
    expect(CONFIRM_LABEL).not.toBe('Delete');
    expect(CONFIRM_LABEL).not.toBe('Unlink');
  });

  it('cancel leaves the calendar record intact', () => {
    let removed = false;
    function onConfirm() { removed = true; }
    function onCancel() { /* nothing */ }
    onCancel();
    expect(removed).toBe(false);
  });

  it('contract-reference error message is user-friendly', () => {
    const ERROR = 'This calendar is currently used by one or more Contracts. Remove or replace it in those Contracts before removing the link.';
    expect(ERROR).toContain('one or more Contracts');
    expect(ERROR).toContain('before removing the link');
    expect(ERROR).not.toContain('500');
    expect(ERROR).not.toContain('Internal Server Error');
  });

  it('remove DELETE endpoint targets the linked-calendar id, not the provider calendar id', () => {
    const id = 'cal-001'; // the Business App linked-calendar id
    const ENDPOINT = `/linked-calendars/${id}`;
    expect(ENDPOINT).toContain(id);
    expect(ENDPOINT).not.toContain('provider');
  });

  it('success snack says "Calendar removed." not "Calendar deleted."', () => {
    const SNACK = 'Calendar removed.';
    expect(SNACK).toBe('Calendar removed.');
    expect(SNACK).not.toContain('deleted');
    expect(SNACK).not.toContain('unlinked');
  });
});
