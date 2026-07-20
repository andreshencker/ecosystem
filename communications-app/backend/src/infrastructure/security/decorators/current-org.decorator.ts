import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the companyId from the current auth context.
 * Returns undefined when no company is scoped to the request.
 *
 * @example
 * @Get()
 * list(@CurrentOrg() companyId: string) { ... }
 */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (request as any).authContext?.companyId as string | undefined;
  },
);
