"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMUNICATION_CATALOG = void 0;
exports.findCatalogEvent = findCatalogEvent;
const platform_seed_1 = require("../seed/platform-seed");
exports.COMMUNICATION_CATALOG = {
    version: 1,
    platform: platform_seed_1.PLATFORM_SEED_DOMAINS,
    business: [],
};
function findCatalogEvent(canonicalKey) {
    const [domainKey, eventKey] = canonicalKey.split('.');
    if (!domainKey || !eventKey)
        return undefined;
    for (const section of ['platform', 'business']) {
        const domain = exports.COMMUNICATION_CATALOG[section].find((d) => d.domainKey === domainKey);
        if (!domain)
            continue;
        const event = domain.events.find((e) => e.eventKey === eventKey);
        if (event)
            return { section, domain: domainKey, event };
    }
    return undefined;
}
//# sourceMappingURL=communication-catalog.js.map