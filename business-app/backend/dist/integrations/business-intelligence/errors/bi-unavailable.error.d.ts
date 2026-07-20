export declare class BIUnavailableError extends Error {
    readonly statusCode?: number;
    readonly category: 'connection_refused' | 'timeout' | 'auth_error' | 'not_found' | 'validation_error' | 'bi_internal_error' | 'unknown';
    constructor(message?: string, statusCode?: number, category?: BIUnavailableError['category']);
    private static categorize;
}
