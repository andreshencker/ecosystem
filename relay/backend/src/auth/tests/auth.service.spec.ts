import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

import { AuthService } from '../auth.service';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { EcosystemIdentityService } from '../../ecosystem/identity/ecosystem-identity.service';

describe('AuthService — Grapifly-only session boundary', () => {
  const identity = {
    resolveGrapiflyCompany: jest.fn(),
    linkGrapiflyIdentity: jest.fn(),
  };
  const tokens = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('relay-access-token') };
  const http = { post: jest.fn() };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EcosystemIdentityService, useValue: identity },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'GRAPIFLY_ID_API_URL') return 'http://grapifly';
              if (key === 'GRAPIFLY_SSO_CLIENT_SECRET') return 'secret';
              return fallback;
            }),
          },
        },
        { provide: HttpService, useValue: http },
        { provide: getModelToken(RefreshToken.name), useValue: tokens },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('exchanges a Grapifly contract and creates a context-bound Relay session', async () => {
    const contract = {
      contractVersion: 2,
      issuer: 'grapifly',
      audience: 'relay',
      grapiflyUserId: 'gpf_usr_1',
      email: 'owner@example.com',
      emailVerified: true,
      displayName: 'Relay Owner',
      avatarUrl: null,
      organization: {
        organizationId: 'gpf_org_1',
        slug: 'acme',
        name: 'Acme',
        isPlatform: false,
      },
      access: {
        applicationRole: 'owner',
      },
    };
    http.post.mockReturnValue(of({ data: contract }));
    identity.resolveGrapiflyCompany.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      companyKey: 'acme',
    });
    identity.linkGrapiflyIdentity.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      grapiflyUserId: 'gpf_usr_1',
      email: contract.email,
      firstName: 'Relay',
      lastName: 'Owner',
      role: 'company_owner',
      scope: 'company',
      companyId: '507f1f77bcf86cd799439011',
      companyKey: 'acme',
      isActive: true,
      isEmailVerified: true,
    });
    tokens.create.mockResolvedValue({});

    const result = await service.loginWithGrapifly('one-time-code');

    expect(result.accessToken).toBe('relay-access-token');
    expect(result.user.grapiflyUserId).toBe('gpf_usr_1');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'gpf_org_1',
        role: 'company_owner',
        // Grapifly's contract no longer carries permissions — Relay derives
        // them locally from applicationRole ('owner' here).
        permissions: expect.arrayContaining(['relay.use', 'relay.organization.manage']),
      }),
    );
  });

  it('prefers RELAY_SERVICE_SECRET over the legacy GRAPIFLY_SSO_CLIENT_SECRET when calling Grapifly', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EcosystemIdentityService, useValue: identity },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'GRAPIFLY_ID_API_URL') return 'http://grapifly';
              if (key === 'RELAY_SERVICE_SECRET') return 'relay-own-secret';
              if (key === 'GRAPIFLY_SSO_CLIENT_SECRET') return 'legacy-shared-secret';
              return fallback;
            }),
          },
        },
        { provide: HttpService, useValue: http },
        { provide: getModelToken(RefreshToken.name), useValue: tokens },
      ],
    }).compile();
    const localService: AuthService = module.get(AuthService);

    http.post.mockReturnValue(
      of({
        data: {
          contractVersion: 2,
          issuer: 'grapifly',
          audience: 'relay',
          grapiflyUserId: 'gpf_usr_1',
          email: 'owner@example.com',
          emailVerified: true,
          displayName: 'Relay Owner',
          avatarUrl: null,
          organization: { organizationId: 'gpf_org_1', slug: 'acme', name: 'Acme', isPlatform: false },
          access: { applicationRole: 'owner' },
        },
      }),
    );
    identity.resolveGrapiflyCompany.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', companyKey: 'acme' });
    identity.linkGrapiflyIdentity.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012', grapiflyUserId: 'gpf_usr_1', email: 'owner@example.com',
      firstName: 'Relay', lastName: 'Owner', role: 'company_owner', scope: 'company',
      companyId: '507f1f77bcf86cd799439011', companyKey: 'acme', isActive: true, isEmailVerified: true,
    });
    tokens.create.mockResolvedValue({});

    await localService.loginWithGrapifly('one-time-code');

    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ headers: { 'x-grapifly-sso-secret': 'relay-own-secret' } }),
    );
  });
});
