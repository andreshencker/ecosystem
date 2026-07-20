export interface CalendarSyncStats {
  linkedCalendarId:   string;
  calendarName:       string;
  accountIdentifier:  string;
  eventsReceived:     number;
  created:            number;
  updated:            number;
  deleted:            number;
  skipped:            number;
  errors:             string[];
  durationMs:         number;
  status:             'completed' | 'failed';
}

export interface BusinessSyncResult {
  businessId:   string;
  calendars:    CalendarSyncStats[];
  totalCreated: number;
  totalUpdated: number;
  totalDeleted: number;
  totalErrors:  number;
  totalDurationMs: number;
  startedAt:    string;
  finishedAt:   string;
}
