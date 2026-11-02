export type CepAddress = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  source: 'BrasilAPI' | 'ViaCEP';
};

type BrasilApiCepResponse = {
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

async function getBrasilApiAddress(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
    if (!response.ok) return null;

    const data = await response.json() as BrasilApiCepResponse;
    return {
      logradouro: data.street || '',
      bairro: data.neighborhood || '',
      localidade: data.city || '',
      uf: data.state || '',
      source: 'BrasilAPI',
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

async function getViaCepAddress(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
    if (!response.ok) return null;

    const data = await response.json() as ViaCepResponse;
    if (data.erro) return null;

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      source: 'ViaCEP',
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function lookupCepAddress(cep: string, signal?: AbortSignal): Promise<CepAddress> {
  const brasilApiAddress = await getBrasilApiAddress(cep, signal);
  if (brasilApiAddress) return brasilApiAddress;

  const viaCepAddress = await getViaCepAddress(cep, signal);
  if (viaCepAddress) return viaCepAddress;

  throw new Error('CEP não encontrado nas fontes disponíveis.');
}
