import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route or controller as publicly accessible — no JWT or API key required.
 * The GlobalAuthGuard checks for this metadata before performing any auth check.
 *
 * @example
 * @Public()
 * @Get('health')
 * check() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
