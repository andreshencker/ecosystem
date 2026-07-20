"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_SEED_DOMAINS = void 0;
const security_seed_1 = require("./domains/security/security.seed");
const contracts_seed_1 = require("./domains/contracts/contracts.seed");
const shifts_seed_1 = require("./domains/shifts/shifts.seed");
const linked_calendars_seed_1 = require("./domains/linked-calendars/linked-calendars.seed");
const calendar_sync_seed_1 = require("./domains/calendar-sync/calendar-sync.seed");
exports.PLATFORM_SEED_DOMAINS = [
    security_seed_1.SECURITY_SEED_DOMAIN,
    contracts_seed_1.CONTRACTS_SEED_DOMAIN,
    shifts_seed_1.SHIFTS_SEED_DOMAIN,
    linked_calendars_seed_1.LINKED_CALENDARS_SEED_DOMAIN,
    calendar_sync_seed_1.CALENDAR_SYNC_SEED_DOMAIN,
];
//# sourceMappingURL=platform-seed.js.map