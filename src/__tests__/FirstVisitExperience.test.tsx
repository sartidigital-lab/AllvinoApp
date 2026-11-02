import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstVisitExperience } from '@/components/onboarding/FirstVisitExperience';
import { FIRST_VISIT_STORAGE_KEY, nextFirstVisitStep, readFirstVisitStep } from '@/lib/onboarding/firstVisit';

vi.mock('@/lib/push/client', () => ({ registerPushSubscription: vi.fn().mockResolvedValue('login-required') }));

describe('first visit flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(screen.getByRole('heading', { name: 'Podemos acessar sua localização?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sem instalar' }));
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir notificações' }));
    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
  });

  it('requests location only after an explicit click and does not retain coordinates', async () => {
    vi.stubGlobal('isSecureContext', true);
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: -20.3, longitude: -40.3 } } as GeolocationPosition));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(<FirstVisitExperience />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'Leve a Allvino com você' })).toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('install');
  });

  it('parses persisted stages safely', () => {
    expect(readFirstVisitStep(null)).toBe('age');
    expect(readFirstVisitStep('unknown')).toBe('age');
    expect(readFirstVisitStep('install')).toBe('install');
    expect(nextFirstVisitStep('location')).toBe('install');
    expect(nextFirstVisitStep('install')).toBe('notifications');
  });
});
