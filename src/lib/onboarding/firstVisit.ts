export type FirstVisitStep = 'age' | 'underage' | 'location' | 'install' | 'notifications' | 'done';

export const FIRST_VISIT_STORAGE_KEY = 'allvino:first-visit:v1';

const savedSteps: FirstVisitStep[] = ['underage', 'location', 'install', 'notifications', 'done'];

export function readFirstVisitStep(value: string | null): FirstVisitStep {
  return value && savedSteps.includes(value as FirstVisitStep) ? value as FirstVisitStep : 'age';
}

export function nextFirstVisitStep(step: FirstVisitStep): FirstVisitStep {
  if (step === 'location') return 'install';
  if (step === 'install') return 'notifications';
  return 'done';
}
