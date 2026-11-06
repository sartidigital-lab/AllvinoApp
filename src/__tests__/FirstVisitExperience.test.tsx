import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { FirstVisitExperience } from '@/components/onboarding/FirstVisitExperience';
import { FIRST_VISIT_STORAGE_KEY, readFirstVisitStep } from '@/lib/onboarding/firstVisit';

describe('first visit flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('asks only for the required age confirmation and persists denial', async () => {
    render(<FirstVisitExperience />);
    expect(await screen.findByRole('heading', { name: 'Você tem 18 anos ou mais?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sou menor de 18' }));
    expect(screen.getByRole('heading', { name: 'Acesso restrito a maiores de 18 anos' })).toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('underage');
  });

  it('does not interrupt an adult with optional permission prompts', async () => {
    render(<FirstVisitExperience />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('done');
  });

  it('parses persisted stages safely', () => {
    expect(readFirstVisitStep(null)).toBe('age');
    expect(readFirstVisitStep('unknown')).toBe('age');
    expect(readFirstVisitStep('underage')).toBe('underage');
  });
});
