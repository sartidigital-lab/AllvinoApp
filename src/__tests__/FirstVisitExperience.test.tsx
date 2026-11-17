import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstVisitExperience } from '@/components/onboarding/FirstVisitExperience';
import { FIRST_VISIT_STORAGE_KEY, nextFirstVisitStep, readFirstVisitStep } from '@/lib/onboarding/firstVisit';

vi.mock('@/lib/push/client', () => ({ registerPushSubscription: vi.fn().mockResolvedValue('login-required') }));

describe('first visit flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 14; Mobile)' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0' });
  });

  it('starts with age verification and persists denial', async () => {
    render(<FirstVisitExperience />);
    expect(await screen.findByRole('heading', { name: 'Você tem 18 anos ou mais?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sou menor de 18' }));
    expect(screen.getByRole('heading', { name: 'Acesso restrito a maiores de 18 anos' })).toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('underage');
  });

  it('lets an adult skip optional permissions and remembers completion', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    render(<FirstVisitExperience />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));
    expect(screen.getByRole('heading', { name: 'Leve a Allvino com você' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sem instalar' }));
    expect(screen.getByRole('heading', { name: 'Deseja permitir notificações?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('done');
  });

  it('does not request browser permissions before the user chooses to', async () => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ available: true }) }));
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    render(<FirstVisitExperience />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sem instalar' }));
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir notificações' }));
    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
  });

  it('opens the browser install prompt only for a mobile visitor after an explicit click', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'accepted' as const });
    const installEvent = Object.assign(new Event('beforeinstallprompt'), { preventDefault: vi.fn(), prompt, userChoice });
    render(<FirstVisitExperience />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));
    await act(async () => window.dispatchEvent(installEvent));
    expect(screen.getByRole('button', { name: 'Baixar aplicativo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar aplicativo' }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });

  it('does not show an install step to desktop visitors', async () => {
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    render(<FirstVisitExperience />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Deseja permitir notificações?' })).toBeInTheDocument());
  });

  it('parses persisted stages safely', () => {
    expect(readFirstVisitStep(null)).toBe('age');
    expect(readFirstVisitStep('unknown')).toBe('age');
    expect(readFirstVisitStep('location')).toBe('install');
    expect(readFirstVisitStep('install')).toBe('install');
    expect(nextFirstVisitStep('install')).toBe('notifications');
  });
});
