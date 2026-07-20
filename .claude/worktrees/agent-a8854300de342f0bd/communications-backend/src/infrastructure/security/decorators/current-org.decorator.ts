import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the organizationId from the current auth context.
 * Returns undefined when no org is scoped to the request.
 *
 * @example
 * @Get()
 * list(@CurrentOrg() orgId: string) { ... }
 */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (request as any).authContext?.organizationId as string | undefined;
  },
);
