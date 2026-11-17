import { describe, expect, it } from 'vitest';
import { getKitEditorHref } from '@/lib/kits/routing';

describe('kit editor routing', () => {
  it('opens the selected Kit in its dedicated editor', () => {
    expect(getKitEditorHref('kit-123')).toBe('/admin/kits?edit=kit-123');
  });

  it('safely encodes the Kit identifier in the URL', () => {
    expect(getKitEditorHref('kit id/1')).toBe('/admin/kits?edit=kit%20id%2F1');
  });
});
