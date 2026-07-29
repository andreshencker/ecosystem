// src/calendar/factory/calendar-implementation.module.ts

import { Module } from '@nestjs/common';

import { CalendarImplementationFactory } from './calendar-implementation.factory';
import { ICloudCalendarProvider } from '../providers/icloud/icloud-calendar.provider';
import { GoogleCalendarProvider } from '../providers/google/google-calendar.provider';
import { OutlookCalendarProvider } from '../providers/outlook/outlook-calendar.provider';

/**
 * CalendarImplementationModule
 *
 * Stateless — no DB access, no config injection.
 * Exports only CalendarImplementationFactory.
 *
 * Import this module anywhere that needs to resolve a calendar provider:
 *   - ProviderCredentialsModule  (credential validation + verifyByImplementation)
 *   - CalendarModule              (future: calendar sync, event dispatch)
 */
@Module({
  providers: [
    CalendarImplementationFactory,

    // Calendar providers
    ICloudCalendarProvider,
    GoogleCalendarProvider,
    OutlookCalendarProvider,
  ],
  exports: [CalendarImplementationFactory],
})
export class CalendarImplementationModule {}
