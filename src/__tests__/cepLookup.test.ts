import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupCepAddress } from '@/lib/address/cep';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lookupCepAddress', () => {
  it('uses BrasilAPI when the primary source responds successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        street: 'Rua Teste',
        neighborhood: 'Centro',
        city: 'Vitória',
        state: 'ES',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(lookupCepAddress('29090650')).resolves.toEqual({
      logradouro: 'Rua Teste',
      bairro: 'Centro',
      localidade: 'Vitória',
      uf: 'ES',
      source: 'BrasilAPI',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://brasilapi.com.br/api/cep/v2/29090650', { signal: undefined });
  });

  it('uses ViaCEP when BrasilAPI is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logradouro: 'Rua Durval Loureiro Nogueira',
          bairro: 'Jardim Camburi',
          localidade: 'Vitória',
          uf: 'ES',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(lookupCepAddress('29090650')).resolves.toMatchObject({
      logradouro: 'Rua Durval Loureiro Nogueira',
      localidade: 'Vitória',
      source: 'ViaCEP',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://viacep.com.br/ws/29090650/json/', { signal: undefined });
  });

  it('reports an error only after both sources fail', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(lookupCepAddress('00000000')).rejects.toThrow('CEP não encontrado nas fontes disponíveis.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
