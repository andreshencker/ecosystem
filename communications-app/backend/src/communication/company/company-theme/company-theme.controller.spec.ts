import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { CompanyThemeController } from './company-theme.controller';

describe('CompanyThemeController', () => {
  const auth = {
    actorType: 'user',
    userId: 'user-1',
    companyId: '507f1f77bcf86cd799439011',
    companyKey: 'acme',
    grapiflyOrganizationId: 'gpf_org_acme',
    role: 'company_owner',
    scope: 'company',
    permissions: ['relay.use', 'relay.theme.manage'],
  } as AuthContext;

  const service = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    removeById: jest.fn(),
  };
  const tenantContext = {
    resolve: jest.fn().mockResolvedValue({
      companyId: auth.companyId,
      grapiflyOrganizationId: auth.grapiflyOrganizationId,
    }),
  };
  const controller = new CompanyThemeController(
    service as any,
    tenantContext as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists themes using the company resolved from the Grapifly session', async () => {
    service.findAll.mockResolvedValue({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    await controller.list(auth, 'true', '20', '0');

    expect(tenantContext.resolve).toHaveBeenCalledWith(auth, 'relay.use');
    expect(service.findAll).toHaveBeenCalledWith({
      companyId: auth.companyId,
      grapiflyOrganizationId: auth.grapiflyOrganizationId,
      active: true,
      limit: 20,
      offset: 0,
    });
  });

  it('scopes a direct theme lookup to the resolved company', async () => {
    await controller.getById(auth, 'theme-1');

    expect(tenantContext.resolve).toHaveBeenCalledWith(auth, 'relay.use');
    expect(service.findById).toHaveBeenCalledWith(
      {
        companyId: auth.companyId,
        grapiflyOrganizationId: auth.grapiflyOrganizationId,
      },
      'theme-1',
    );
  });

  it.each([
    ['create', () => controller.create(auth, { label: 'Theme' } as any)],
    ['update', () => controller.update(auth, 'theme-1', { label: 'Updated' })],
    ['delete', () => controller.remove(auth, 'theme-1')],
  ])('requires relay.theme.manage to %s a theme', async (_name, invoke) => {
    await invoke();

    expect(tenantContext.resolve).toHaveBeenCalledWith(
      auth,
      'relay.theme.manage',
    );
  });
});
