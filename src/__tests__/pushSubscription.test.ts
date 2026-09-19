import { describe, expect, it } from 'vitest';
import { isSameOrigin, pushSubscriptionSchema } from '@/lib/push/subscription';

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123456789012345678901234567890',
  keys: { p256dh: 'A'.repeat(60), auth: 'B'.repeat(24) },
};

describe('push subscription validation', () => {
  it('accepts a browser push endpoint and rejects private or spoofed hosts', () => {
    expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: 'http://127.0.0.1/push' }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: 'https://fcm.googleapis.com.evil.test/endpoint' }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: 'https://user:pass@fcm.googleapis.com/endpoint' }).success).toBe(false);
  });

  it('rejects malformed keys and cross-origin writes', () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, keys: { p256dh: 'invalid', auth: 'abc' } }).success).toBe(false);
    expect(isSameOrigin(new Request('https://allvino.com.br/api/push/subscription', { headers: { origin: 'https://allvino.com.br' } }))).toBe(true);
    expect(isSameOrigin(new Request('https://allvino.com.br/api/push/subscription', { headers: { origin: 'https://evil.test' } }))).toBe(false);
  });
});
