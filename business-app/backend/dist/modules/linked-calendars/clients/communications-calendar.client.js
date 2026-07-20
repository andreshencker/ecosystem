"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommunicationsCalendarClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsCalendarClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const communication_connection_service_1 = require("../../../integrations/communications/connection/communication-connection.service");
let CommunicationsCalendarClient = CommunicationsCalendarClient_1 = class CommunicationsCalendarClient {
    connections;
    http;
    config;
    logger = new common_1.Logger(CommunicationsCalendarClient_1.name);
    constructor(connections, http, config) {
        this.connections = connections;
        this.http = http;
        this.config = config;
    }
    get baseUrl() {
        return (this.config.get('COMMUNICATION_API_URL') ?? 'http://localhost:3001').replace(/\/$/, '');
    }
    async resolveConnection(businessId) {
        const conn = await this.connections.getCommunicationConnectionForContext('business', businessId);
        if (!conn) {
            throw new common_1.ServiceUnavailableException('Communications integration is not configured for this Business. ' +
                'Go to Settings → Communications to connect your integration token.');
        }
        return { decryptedToken: conn.decryptedToken };
    }
    async listCalendarAccounts(businessId) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections`;
        this.logger.log(`[listCalendarAccounts] businessId=${businessId} token=${ctx.decryptedToken.slice(0, 12)}...`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 10_000,
            }));
            const connections = res.data?.data ?? [];
            return connections
                .filter((c) => c.isActive)
                .map((c) => {
                const ccp = c.companyChannelProvider;
                const prov = ccp?.provider;
                const chan = ccp?.channel;
                return {
                    connectionId: c.id,
                    providerKey: prov?.providerKey ?? 'unknown',
                    providerDisplayName: prov?.displayName ?? chan?.displayName ?? prov?.providerKey ?? 'Calendar',
                    accountIdentifier: c.displayIdentifier ?? c.id,
                    isActive: c.isActive,
                };
            });
        }
        catch (err) {
            this.logger.error(`[listCalendarAccounts] Failed for businessId=${businessId}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not retrieve calendar accounts from Communications: ${err?.message ?? 'Unknown error'}`);
        }
    }
    async listCalendars(businessId, connectionId) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars`;
        this.logger.log(`[listCalendars] businessId=${businessId} connectionId=${connectionId} token=${ctx.decryptedToken.slice(0, 12)}...`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 10_000,
            }));
            const calendars = res.data?.data ?? [];
            return calendars.map((cal) => ({
                externalCalendarId: cal.id,
                calendarName: cal.name,
                calendarDescription: cal.description ?? null,
                timezone: cal.timeZone ?? null,
                accessRole: cal.isReadOnly ? 'read-only' : 'read-write',
                isPrimary: cal.isPrimary ?? false,
            }));
        }
        catch (err) {
            this.logger.error(`[listCalendars] Failed connectionId=${connectionId} businessId=${businessId}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not retrieve calendars from Communications: ${err?.message ?? 'Unknown error'}`);
        }
    }
    async getCalendarAccount(businessId, connectionId) {
        const accounts = await this.listCalendarAccounts(businessId);
        return accounts.find((a) => a.connectionId === connectionId) ?? null;
    }
    async createCalendar(businessId, connectionId, body) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars`;
        this.logger.log(`[createCalendar] businessId=${businessId} connectionId=${connectionId} name="${body.name}"`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 15_000,
            }));
            const raw = res.data?.data ?? res.data;
            return {
                externalCalendarId: raw.id,
                calendarName: raw.name,
                calendarDescription: raw.description ?? null,
                timezone: raw.timeZone ?? null,
                accessRole: raw.isReadOnly ? 'read-only' : 'read-write',
                isPrimary: raw.isPrimary ?? false,
            };
        }
        catch (err) {
            this.logger.error(`[createCalendar] Failed connectionId=${connectionId} businessId=${businessId}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not create calendar in provider: ${err?.response?.data?.message ?? err?.message ?? 'Unknown error'}`);
        }
    }
    async subscribeToUrl(businessId, connectionId, body) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/subscribe`;
        this.logger.log(`[subscribeToUrl] businessId=${businessId} connectionId=${connectionId} url="${body.url.slice(0, 60)}..."`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 20_000,
            }));
            const raw = res.data?.data ?? res.data;
            return {
                externalCalendarId: raw.id,
                calendarName: raw.name,
                calendarDescription: raw.description ?? null,
                timezone: raw.timeZone ?? null,
                accessRole: raw.isReadOnly ? 'read-only' : 'read-write',
                isPrimary: raw.isPrimary ?? false,
            };
        }
        catch (err) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            this.logger.error(`[subscribeToUrl] Failed connectionId=${connectionId} HTTP=${status}: ${message}`);
            if (status === 422) {
                throw new common_1.UnprocessableEntityException(message);
            }
            if (status === 400) {
                throw new common_1.BadRequestException(message);
            }
            throw new common_1.ServiceUnavailableException(`Could not subscribe to calendar URL: ${message}`);
        }
    }
    async listCalendarEvents(businessId, connectionId, calendarId, params) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events`;
        this.logger.log(`[listCalendarEvents] businessId=${businessId} connectionId=${connectionId} ` +
            `calendarId=${calendarId.slice(0, 40)} from=${params?.from ?? 'default'} to=${params?.to ?? 'default'}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-api-key': ctx.decryptedToken },
                params: {
                    ...(params?.from ? { from: params.from } : {}),
                    ...(params?.to ? { to: params.to } : {}),
                    ...(params?.limit ? { limit: params.limit } : {}),
                },
                timeout: 30_000,
            }));
            const raw = res.data;
            const items = raw?.data?.items ??
                raw?.items ??
                [];
            this.logger.log(`[listCalendarEvents] received ${items.length} events for calendarId=${calendarId.slice(0, 40)}`);
            return items;
        }
        catch (err) {
            const status = err?.response?.status;
            this.logger.error(`[listCalendarEvents] Failed connectionId=${connectionId} calendarId=${calendarId.slice(0, 40)} ` +
                `HTTP=${status ?? 'none'}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not retrieve events from Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`);
        }
    }
    async createCalendarEvent(businessId, connectionId, calendarId, event) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events`;
        this.logger.log(`[createCalendarEvent] businessId=${businessId} connectionId=${connectionId} ` +
            `calendarId=${calendarId.slice(0, 40)} title="${event.title}"`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, event, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 15_000,
            }));
            const raw = res.data?.data ?? res.data;
            return raw;
        }
        catch (err) {
            const status = err?.response?.status;
            this.logger.error(`[createCalendarEvent] Failed connectionId=${connectionId} HTTP=${status ?? 'none'}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not create calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`);
        }
    }
    async updateCalendarEvent(businessId, connectionId, calendarId, eventId, event) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
        this.logger.log(`[updateCalendarEvent] businessId=${businessId} connectionId=${connectionId} eventId=${eventId.slice(0, 40)}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.patch(url, event, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 15_000,
            }));
            const raw = res.data?.data ?? res.data;
            return raw;
        }
        catch (err) {
            const status = err?.response?.status;
            this.logger.error(`[updateCalendarEvent] Failed connectionId=${connectionId} eventId=${eventId.slice(0, 40)} HTTP=${status ?? 'none'}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not update calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`);
        }
    }
    async deleteCalendarEvent(businessId, connectionId, calendarId, eventId) {
        const ctx = await this.resolveConnection(businessId);
        const url = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
        this.logger.log(`[deleteCalendarEvent] businessId=${businessId} connectionId=${connectionId} eventId=${eventId.slice(0, 40)}`);
        try {
            await (0, rxjs_1.firstValueFrom)(this.http.delete(url, {
                headers: { 'x-api-key': ctx.decryptedToken },
                timeout: 15_000,
            }));
            return true;
        }
        catch (err) {
            const status = err?.response?.status;
            if (status === 404) {
                this.logger.log(`[deleteCalendarEvent] eventId=${eventId.slice(0, 40)} already absent in provider (404) — treating as success`);
                return true;
            }
            this.logger.error(`[deleteCalendarEvent] Failed connectionId=${connectionId} eventId=${eventId.slice(0, 40)} HTTP=${status ?? 'none'}: ${err?.message}`);
            throw new common_1.ServiceUnavailableException(`Could not delete calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`);
        }
    }
};
exports.CommunicationsCalendarClient = CommunicationsCalendarClient;
exports.CommunicationsCalendarClient = CommunicationsCalendarClient = CommunicationsCalendarClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [communication_connection_service_1.CommunicationConnectionService,
        axios_1.HttpService,
        config_1.ConfigService])
], CommunicationsCalendarClient);
//# sourceMappingURL=communications-calendar.client.js.map