import { afterEach, describe, expect, it, vi } from 'vitest';
import { toDatetimeLocalValue } from '@/lib/datetimeLocal';

describe('toDatetimeLocalValue', () => {
  afterEach(() => vi.restoreAllMocks());

  it('converts a UTC timestamp to the browser local value without shifting it on save', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(180);

    expect(toDatetimeLocalValue('2026-08-17T01:50:00.000Z')).toBe('2026-08-16T22:50');
  });
});
