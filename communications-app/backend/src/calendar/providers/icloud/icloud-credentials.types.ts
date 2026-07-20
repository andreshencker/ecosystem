// src/calendar/providers/icloud/icloud-credentials.types.ts

/**
 * iCloud Calendar credentials.
 *
 * Apple requires an App-Specific Password for third-party apps accessing
 * iCloud services (CalDAV). The user generates it at appleid.apple.com.
 *
 * Base URL: https://caldav.icloud.com
 */
export interface ICloudCredentials {
  appleId: string;            // e.g. user@icloud.com
  appSpecificPassword: string; // 16-char app-specific password (xxxx-xxxx-xxxx-xxxx)
}
