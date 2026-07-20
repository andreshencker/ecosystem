"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCatalog = validateCatalog;
exports.assertCatalogValid = assertCatalogValid;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
function validateKey(key, label, errors) {
    if (!KEY_PATTERN.test(key)) {
        errors.push(`${label} "${key}" must match pattern /^[a-z][a-z0-9_]*/`);
    }
}
function validateEvent(event, domainKey, errors) {
    const prefix = `[${domainKey}.${event.eventKey}]`;
    if (!event.displayName?.trim())
        errors.push(`${prefix} missing displayName`);
    if (!event.description?.trim())
        errors.push(`${prefix} missing description`);
    if (!event.eventKey)
        errors.push(`${prefix} missing eventKey`);
    else
        validateKey(event.eventKey, `${prefix} eventKey`, errors);
    const { email, sms, push } = event.channels ?? {};
    const hasAnyChannel = email !== undefined || sms !== undefined || push !== undefined;
    if (!hasAnyChannel) {
        errors.push(`${prefix} must have at least one channel defined`);
    }
    if (email?.enabled) {
        if (!email.subject?.trim())
            errors.push(`${prefix} email.subject required when enabled`);
        if (!email.content?.trim())
            errors.push(`${prefix} email.content required when enabled`);
        if (!Array.isArray(email.requiredVariables))
            errors.push(`${prefix} email.requiredVariables must be an array`);
        if (!Array.isArray(email.optionalVariables))
            errors.push(`${prefix} email.optionalVariables must be an array`);
    }
}
function validateDomain(domain, seenCanonical, errors) {
    const prefix = `[domain:${domain.domainKey}]`;
    if (!domain.domainKey) {
        errors.push(`${prefix} missing domainKey`);
        return;
    }
    validateKey(domain.domainKey, `${prefix} domainKey`, errors);
    if (!domain.displayName?.trim())
        errors.push(`${prefix} missing displayName`);
    if (!domain.domainCategory?.trim())
        errors.push(`${prefix} missing domainCategory`);
    const seenEventKeys = new Set();
    for (const event of domain.events ?? []) {
        if (!event.eventKey) {
            errors.push(`${prefix} event missing eventKey`);
            continue;
        }
        if (seenEventKeys.has(event.eventKey)) {
            errors.push(`${prefix} duplicate eventKey "${event.eventKey}"`);
        }
        seenEventKeys.add(event.eventKey);
        const canonical = `${domain.domainKey}.${event.eventKey}`;
        if (seenCanonical.has(canonical)) {
            errors.push(`Duplicate canonicalKey "${canonical}" across platform and business sections`);
        }
        seenCanonical.add(canonical);
        validateEvent(event, domain.domainKey, errors);
    }
}
function validateCatalog(catalog) {
    const errors = [];
    const seenCanonical = new Set();
    const seenPlatformDomains = new Set();
    for (const domain of catalog.platform ?? []) {
        if (seenPlatformDomains.has(domain.domainKey)) {
            errors.push(`Duplicate domainKey "${domain.domainKey}" in platform section`);
        }
        seenPlatformDomains.add(domain.domainKey);
        validateDomain(domain, seenCanonical, errors);
    }
    const seenBusinessDomains = new Set();
    for (const domain of catalog.business ?? []) {
        if (seenBusinessDomains.has(domain.domainKey)) {
            errors.push(`Duplicate domainKey "${domain.domainKey}" in business section`);
        }
        seenBusinessDomains.add(domain.domainKey);
        validateDomain(domain, seenCanonical, errors);
    }
    return errors;
}
function assertCatalogValid(catalog) {
    const errors = validateCatalog(catalog);
    if (errors.length > 0) {
        throw new Error(`COMMUNICATION_CATALOG is invalid:\n  ${errors.join('\n  ')}`);
    }
}
//# sourceMappingURL=communication-catalog.validator.js.map