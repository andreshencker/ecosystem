"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_CALENDAR_CATALOGUE = void 0;
exports.getCatalogueEntry = getCatalogueEntry;
exports.getAvailableCatalogueEntries = getAvailableCatalogueEntries;
exports.getCatalogueByCountry = getCatalogueByCountry;
exports.toSafeEntry = toSafeEntry;
const AU_ENTRIES = [
    {
        key: 'au_national_public_holidays',
        country: 'AU',
        region: 'national',
        regionLabel: 'Australia — National (all states combined)',
        displayName: 'Australian Public Holidays',
        description: 'Public holidays across all Australian states and territories, combined.',
        subscriptionUrl: 'https://calendar.google.com/calendar/ical/en.australian%23holiday%40group.v.calendar.google.com/public/basic.ics',
        source: 'Google Calendar — built-in Australian Holidays feed (google.com/calendar)',
        limitations: 'Combines all states. Does not separate national vs state-specific holidays.',
        recommendedFlow: 'holidays',
        available: true,
    },
    {
        key: 'au_act_public_holidays',
        country: 'AU',
        region: 'AU-ACT',
        regionLabel: 'Australian Capital Territory',
        displayName: 'ACT Public Holidays',
        description: 'Official public holidays for the Australian Capital Territory.',
        subscriptionUrl: null,
        source: 'Not yet sourced — ACT Government does not publish a stable iCal feed.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_nsw_public_holidays',
        country: 'AU',
        region: 'AU-NSW',
        regionLabel: 'New South Wales',
        displayName: 'NSW Public Holidays',
        description: 'Official public holidays for New South Wales.',
        subscriptionUrl: null,
        source: 'Not yet sourced — NSW Government does not publish a stable iCal subscription URL.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_nt_public_holidays',
        country: 'AU',
        region: 'AU-NT',
        regionLabel: 'Northern Territory',
        displayName: 'NT Public Holidays',
        description: 'Official public holidays for the Northern Territory.',
        subscriptionUrl: null,
        source: 'Not yet sourced.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_qld_public_holidays',
        country: 'AU',
        region: 'AU-QLD',
        regionLabel: 'Queensland',
        displayName: 'Queensland Public Holidays',
        description: 'Official public holidays for Queensland.',
        subscriptionUrl: null,
        source: 'Not yet sourced — Queensland Government calendar at calendar.qld.gov.au does not expose a stable iCal subscription URL.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_sa_public_holidays',
        country: 'AU',
        region: 'AU-SA',
        regionLabel: 'South Australia',
        displayName: 'SA Public Holidays',
        description: 'Official public holidays for South Australia.',
        subscriptionUrl: null,
        source: 'Not yet sourced.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_tas_public_holidays',
        country: 'AU',
        region: 'AU-TAS',
        regionLabel: 'Tasmania',
        displayName: 'Tasmanian Public Holidays',
        description: 'Official public holidays for Tasmania.',
        subscriptionUrl: null,
        source: 'Not yet sourced.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_vic_public_holidays',
        country: 'AU',
        region: 'AU-VIC',
        regionLabel: 'Victoria',
        displayName: 'Victorian Public Holidays',
        description: 'Official public holidays for Victoria.',
        subscriptionUrl: null,
        source: 'Not yet sourced.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
    {
        key: 'au_wa_public_holidays',
        country: 'AU',
        region: 'AU-WA',
        regionLabel: 'Western Australia',
        displayName: 'WA Public Holidays',
        description: 'Official public holidays for Western Australia.',
        subscriptionUrl: null,
        source: 'Not yet sourced.',
        limitations: null,
        recommendedFlow: 'holidays',
        available: false,
    },
];
exports.PUBLIC_CALENDAR_CATALOGUE = [
    ...AU_ENTRIES,
];
function getCatalogueEntry(key) {
    return exports.PUBLIC_CALENDAR_CATALOGUE.find((e) => e.key === key);
}
function getAvailableCatalogueEntries(country) {
    return exports.PUBLIC_CALENDAR_CATALOGUE.filter((e) => e.available && e.subscriptionUrl && (!country || e.country === country));
}
function getCatalogueByCountry(country) {
    return exports.PUBLIC_CALENDAR_CATALOGUE.filter((e) => e.country === country);
}
function toSafeEntry(entry) {
    return {
        key: entry.key,
        country: entry.country,
        region: entry.region,
        regionLabel: entry.regionLabel,
        displayName: entry.displayName,
        description: entry.description,
        recommendedFlow: entry.recommendedFlow,
        available: entry.available,
        limitations: entry.limitations,
    };
}
//# sourceMappingURL=public-calendar-catalogue.js.map