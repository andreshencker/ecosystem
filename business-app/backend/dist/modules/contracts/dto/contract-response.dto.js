"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toContractResponse = toContractResponse;
function mapRate(r) {
    return {
        days: r.days,
        startTime: r.startTime ?? null,
        endTime: r.endTime ?? null,
        hourlyRate: r.hourlyRate,
    };
}
function mapHolidayRules(hr) {
    if (!hr) {
        return {
            enabled: false, calendarId: null, calendarName: null,
            calendarProviderName: null, behaviour: 'normal_rate',
            multiplier: null, fixedHourlyRate: null,
        };
    }
    let enabled;
    let behaviour;
    if ('behaviour' in hr) {
        enabled = hr.enabled ?? (hr.calendarId != null);
        behaviour = hr.behaviour ?? 'normal_rate';
    }
    else {
        enabled = hr.enabled ?? false;
        const workAllowed = hr.workAllowed ?? true;
        const payMethod = hr.payMethod !== undefined ? hr.payMethod ?? 'normal_rate' : 'normal_rate';
        behaviour = !workAllowed ? 'no_work' : payMethod;
    }
    return {
        enabled,
        calendarId: hr.calendarId ?? null,
        calendarName: hr.calendarName ?? null,
        calendarProviderName: hr.calendarProviderName ?? null,
        behaviour,
        multiplier: hr.multiplier ?? null,
        fixedHourlyRate: hr.fixedHourlyRate ?? null,
    };
}
function mapSuperannuationRules(sr) {
    if (!sr || !sr.enabled) {
        return { enabled: false, rate: null, paymentFrequency: null };
    }
    return {
        enabled: true,
        rate: sr.rate ?? null,
        paymentFrequency: sr.paymentFrequency ?? null,
    };
}
function toContractResponse(doc) {
    const d = doc;
    const toISO = (v) => v instanceof Date ? v.toISOString() : String(v ?? '');
    return {
        id: String(d._id),
        businessId: d.businessId,
        customerId: d.customerId,
        customerName: d.customerName ?? null,
        startDate: toISO(d.startDate),
        endDate: d.endDate ? toISO(d.endDate) : null,
        positionName: d.positionName,
        workType: d.workType ?? 'contractor',
        invoiceDescription: d.invoiceDescription,
        status: d.status,
        billingCycle: d.billingCycle,
        invoiceDueRule: d.invoiceDueRule ?? 'from_invoice_date',
        paymentTermsDays: d.paymentTermsDays,
        scheduledPaymentEnabled: d.scheduledPaymentEnabled ?? false,
        scheduledPaymentDay: (d.scheduledPaymentEnabled ?? false) ? (d.scheduledPaymentDay ?? null) : null,
        rateType: d.rateType,
        minimumHours: d.minimumHours ?? 4,
        defaultBreakMinutes: d.defaultBreakMinutes ?? 30,
        rates: (d.rates ?? []).map(mapRate),
        notes: d.notes ?? null,
        useInvoicePrefix: d.useInvoicePrefix ?? (d.invoicePrefix ? true : false),
        invoicePrefix: d.invoicePrefix ?? null,
        startingInvoiceNumber: d.startingInvoiceNumber ?? 1,
        currency: d.currency ?? 'AUD',
        chargeGst: d.chargeGst ?? false,
        gstRate: (d.chargeGst ?? false) ? (d.gstRate ?? null) : null,
        holidayRules: mapHolidayRules(d.holidayRules),
        superannuationRules: mapSuperannuationRules(d.superannuationRules),
        paymentCalendarEnabled: d.paymentCalendarEnabled ?? false,
        paymentCalendarSubscriptionId: (d.paymentCalendarEnabled ?? false)
            ? (d.paymentCalendarSubscriptionId ?? null)
            : null,
        createdAt: toISO(d.createdAt),
        updatedAt: toISO(d.updatedAt),
    };
}
//# sourceMappingURL=contract-response.dto.js.map