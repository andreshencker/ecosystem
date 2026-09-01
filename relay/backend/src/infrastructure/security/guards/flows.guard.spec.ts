import { ForbiddenException } from '@nestjs/common';
import { FlowsGuard } from './flows.guard';

describe('FlowsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new FlowsGuard(reflector as any);
  const context = (authContext: unknown) => ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ authContext }) }),
  }) as any;

  it('allows a user whose Grapifly flow is enabled on the route', () => {
    reflector.getAllAndOverride.mockReturnValue(['client']);
    expect(guard.canActivate(context({ actorType: 'user', flow: 'client' }))).toBe(true);
  });

  it('rejects a user from another flow', () => {
    reflector.getAllAndOverride.mockReturnValue(['internal']);
    expect(() => guard.canActivate(context({ actorType: 'user', flow: 'client' })))
      .toThrow(ForbiddenException);
  });

  it('leaves machine routes to their token permission checks', () => {
    reflector.getAllAndOverride.mockReturnValue(['internal']);
    expect(guard.canActivate(context({ actorType: 'apikey' }))).toBe(true);
  });
});
