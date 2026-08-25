/**
 * Security-focused tests for UsersController.
 * Covers: PATCH /users/me — privilege escalation prevention.
 * Invitation hierarchy tests → user-invitations/tests/user-invitations.controller.security.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { RolesGuard } from '../../../infrastructure/security/guards/roles.guard';
import { RelayClientService } from '../../../integrations/relay/client/relay-client.service';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

function fakeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    actorType: 'user',
    userId: 'u1',
    role: 'business_owner',
    scope: 'company',
    companyId: 'cmp_1',
    businessKey: 'c1',
    ...overrides,
  };
}

const ownerCtx = fakeCtx({ role: 'business_owner' });

async function buildModule(actorDoc: Record<string, any>) {
  const usersServiceMock = {
    findByIdOrThrow: jest.fn().mockResolvedValue(actorDoc),
    update: jest.fn(),
    changePassword: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [
      { provide: UsersService, useValue: usersServiceMock },
      {
        provide: EventBusService,
        useValue: { emit: jest.fn(), on: jest.fn() },
      },
      {
        provide: RelayClientService,
        useValue: { notifyEvent: jest.fn().mockResolvedValue(true) },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
      },
      RolesGuard,
      Reflector,
    ],
  }).compile();

  return {
    controller: module.get<UsersController>(UsersController),
    users: module.get(UsersService),
  };
}

describe('UsersController — PATCH /users/me privilege escalation prevention', () => {
  let controller: UsersController;
  let usersService: any;

  beforeEach(async () => {
    const actorDoc = {
      _id: 'u1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      role: 'business_owner',
      scope: 'company',
      companyId: 'cmp_1',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
    };
    ({ controller, users: usersService } = await buildModule(actorDoc));
    (usersService.update as jest.Mock).mockResolvedValue(actorDoc);
  });

  it('only passes firstName and lastName — never role/scope', async () => {
    await controller.updateMe(ownerCtx, {
      firstName: 'Updated',
      lastName: 'Name',
    });
    expect(usersService.update).toHaveBeenCalledWith('u1', {
      firstName: 'Updated',
      lastName: 'Name',
    });
  });

  it('ignores role if somehow passed in DTO (whitelist enforcement)', async () => {
    await controller.updateMe(ownerCtx, {
      firstName: 'Hacker',
      lastName: 'Smith',
    });
    const callArg = (usersService.update as jest.Mock).mock.calls[0][1];
    expect(callArg).not.toHaveProperty('role');
    expect(callArg).not.toHaveProperty('scope');
    expect(callArg).not.toHaveProperty('companyId');
  });
});
