import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthModal } from '@/components/auth/AuthModal';

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), announce: vi.fn(), search: 'login=true&redirectTo=%2Fcupons' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.search), usePathname: () => '/catalogo', useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('@/lib/auth/browserSession', () => ({ announceAuthStateChange: mocks.announce }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('acesso pelo catálogo', () => {
  it('após senha válida volta aos cupons pretendidos', async () => {
    mocks.search = 'login=true&redirectTo=%2Fcupons';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    render(<AuthModal />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'cliente@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.submit(screen.getByLabelText('Senha').closest('form')!);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/cupons'));
    expect(mocks.announce).toHaveBeenCalled();
  });

  it('encaminha o produto pretendido ao iniciar Google e informa falhas', async () => {
    mocks.search = 'login=true&redirectTo=%2Fcatalogo%2Fitem-123';
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Falha simulada' }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Google' }));
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/oauth', expect.objectContaining({ body: JSON.stringify({ redirectTo: '/catalogo/item-123' }) }));
    expect(screen.getByText('Falha simulada')).toBeVisible();
  });
});
