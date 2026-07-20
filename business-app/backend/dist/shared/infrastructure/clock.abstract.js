"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemClock = exports.Clock = void 0;
class Clock {
}
exports.Clock = Clock;
class SystemClock extends Clock {
    now() {
        return new Date();
    }
    nowIso() {
        return new Date().toISOString();
    }
}
exports.SystemClock = SystemClock;
//# sourceMappingURL=clock.abstract.js.map