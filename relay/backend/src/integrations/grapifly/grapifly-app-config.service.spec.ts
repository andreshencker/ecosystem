import { of, throwError } from 'rxjs';
import { GrapiflyAppConfigService, RELAY_APP_CONFIG_FALLBACK } from './grapifly-app-config.service';

describe('GrapiflyAppConfigService', () => {
  const remote = {
    ...RELAY_APP_CONFIG_FALLBACK,
    name: 'Relay Central',
    theme: {
      ...RELAY_APP_CONFIG_FALLBACK.theme,
      light: { ...RELAY_APP_CONFIG_FALLBACK.theme.light, primaryColor: '#123456' },
    },
  };

  it('loads the public central brand config', async () => {
    const http = { get: jest.fn().mockReturnValue(of({ data: remote })) };
    const config = { get: jest.fn((key: string) => ({ RELAY_SERVICE_SECRET: 'secret', GRAPIFLY_ID_API_URL: 'http://grapifly' })[key]) };
    const service = new GrapiflyAppConfigService(http as any, config as any);

    await expect(service.getConfig()).resolves.toEqual(remote);
    expect(http.get).toHaveBeenCalledWith('http://grapifly/catalog/apps/relay/public-config', { timeout: 3000 });
  });

  it('uses the safe local fallback when Grapifly is unavailable', async () => {
    const http = { get: jest.fn().mockReturnValue(throwError(() => new Error('offline'))) };
    const config = { get: jest.fn((key: string) => key === 'RELAY_SERVICE_SECRET' ? 'secret' : undefined) };
    const service = new GrapiflyAppConfigService(http as any, config as any);

    await expect(service.getConfig()).resolves.toEqual(RELAY_APP_CONFIG_FALLBACK);
  });

  it('rejects an invalid remote color and falls back', async () => {
    const http = { get: jest.fn().mockReturnValue(of({ data: { ...remote, theme: { ...remote.theme, light: { ...remote.theme.light, primaryColor: 'red' } } } })) };
    const config = { get: jest.fn((key: string) => key === 'RELAY_SERVICE_SECRET' ? 'secret' : undefined) };
    const service = new GrapiflyAppConfigService(http as any, config as any);

    await expect(service.getConfig()).resolves.toEqual(RELAY_APP_CONFIG_FALLBACK);
  });
});
