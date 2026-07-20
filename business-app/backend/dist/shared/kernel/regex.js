"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGEX = void 0;
exports.REGEX = {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_E164: /^\+[1-9]\d{1,14}$/,
    ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
    ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    CURRENCY_CODE: /^[A-Z]{3}$/,
    COUNTRY_CODE_2: /^[A-Z]{2}$/,
    LANGUAGE_CODE_2: /^[a-z]{2}$/,
    POSTAL_CODE_AU: /^\d{4}$/,
    ABN_AU: /^\d{11}$/,
    SLUG: /^[a-z0-9]+(-[a-z0-9]+)*$/,
    MONGO_OBJECT_ID: /^[0-9a-fA-F]{24}$/,
    URL: /^https?:\/\/.+/,
};
//# sourceMappingURL=regex.js.map