import { z } from 'zod';

const pushEndpoint = z.string().url().min(32).max(2048).refine((value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return host === 'fcm.googleapis.com' || host === 'fcm-xm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' || host === 'web.push.apple.com' ||
      host.endsWith('.notify.windows.com');
  } catch {
    return false;
  }
}, 'Endpoint de push não reconhecido.');

const base64url = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpoint,
  keys: z.object({
    p256dh: base64url.min(40).max(256),
    auth: base64url.min(16).max(128),
  }),
});

export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>;

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
