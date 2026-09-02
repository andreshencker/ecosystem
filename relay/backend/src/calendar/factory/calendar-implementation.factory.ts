// src/calendar/factory/calendar-implementation.factory.ts

import { Injectable } from '@nestjs/common';

import type { ICalendarProvider } from '../interfaces/calendar-provider.interface';
import { ICloudCalendarProvider } from '../providers/icloud/icloud-calendar.provider';
import { GoogleCalendarProvider } from '../providers/google/google-calendar.provider';
import { OutlookCalendarProvider } from '../providers/outlook/outlook-calendar.provider';
import { UnsupportedProviderKeyError } from '../../communication/channels/implementation/shared/credentials.errors';
import { lowerTrim } from '../../communication/channels/implementation/shared/credentials.utils';

/**
 * CalendarImplementationFactory
 *
 * Single source of truth for calendar provider resolution.
 * Routes providerKey → ICalendarProvider implementation.
 *
 * This is the only place in the codebase where the providerKey-to-class
 * mapping exists for calendar providers. No switch statements anywhere else.
 *
 * Supported providerKeys (must match catalog seed):
 *   'icloud'           → ICloudCalendarProvider    (connectionType: app_password)
 *   'google_calendar'  → GoogleCalendarProvider    (connectionType: oauth)
 *   'outlook_calendar' → OutlookCalendarProvider   (connectionType: oauth)
 */
@Injectable()
export class CalendarImplementationFactory {
  constructor(
    private readonly icloud: ICloudCalendarProvider,
    private readonly google: GoogleCalendarProvider,
    private readonly outlook: OutlookCalendarProvider,
  ) {}

  /**
   * Returns the ICalendarProvider implementation for the given providerKey.
   * Throws UnsupportedProviderKeyError if the key is not registered.
   */
  getCalendarProvider(providerKey: string): ICalendarProvider {
    const pk = lowerTrim(providerKey);

    switch (pk) {
      case 'icloud':
        return this.icloud;

      case 'google_calendar':
        return this.google;

      case 'outlook_calendar':
        return this.outlook;

      default:
        throw new UnsupportedProviderKeyError('CALENDAR', providerKey);
    }
  }
}
