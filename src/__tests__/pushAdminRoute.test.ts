import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  selectRows: vi.fn(),
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  filterByOwner: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.isAdmin,
    from: () => ({ select: () => ({
      eq: mocks.filterByOwner,
      order: () => ({ limit: mocks.selectRows }),
    }) }),
  }),
}));
vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimitDistributed: async () => ({ allowed: true, retryAfter: 0 }),
  getClientKey: () => 'test',
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock('web-push', () => ({ default: { sendNotification: mocks.sendNotification, setVapidDetails: mocks.setVapidDetails } }));

import { POST } from '@/app/api/admin/notificacoes/route';

const request = (body: object, origin = 'https://allvino.com.br') => new Request('https://allvino.com.br/api/admin/notificacoes', {
  method: 'POST',
  headers: { origin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('admin push delivery', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VAPID_PUBLIC_KEY', 'public-test-key');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'private-test-key');
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });
    mocks.isAdmin.mockResolvedValue({ data: true, error: null });
    mocks.sendNotification.mockResolvedValue({ statusCode: 201 });
    mocks.filterByOwner.mockImplementation(() => ({ order: () => ({ limit: mocks.selectRows }) }));
  });

  it('does not send from another origin or a non-admin account', async () => {
    expect((await POST(request({ title: 'Novidade', body: 'Confira nossa seleção', url: '/catalogo' }, 'https://evil.test'))).status).toBe(403);
    mocks.isAdmin.mockResolvedValue({ data: false, error: null });
    expect((await POST(request({ title: 'Novidade', body: 'Confira nossa seleção', url: '/catalogo' }))).status).toBe(403);
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('delivers a bounded same-origin campaign to a valid subscription', async () => {
    mocks.selectRows.mockResolvedValue({ data: [{
      id: 'sub-id',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123456789012345678901234567890',
      p256dh: 'A'.repeat(60),
      auth_secret: 'B'.repeat(24),
    }], error: null });
    const response = await POST(request({ title: 'Novidade', body: 'Confira nossa seleção', url: '/catalogo' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 1, failed: 0, expired: 0 });
    expect(mocks.sendNotification).toHaveBeenCalledOnce();
    const payload = JSON.parse(mocks.sendNotification.mock.calls[0][1]);
    expect(payload).toEqual({ title: 'Novidade', body: 'Confira nossa seleção', url: '/catalogo' });
    expect(mocks.filterByOwner).not.toHaveBeenCalled();
  });

  it('sends a test only to one subscription owned by the administrator', async () => {
    mocks.selectRows.mockResolvedValue({ data: [{
      id: 'admin-subscription',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123456789012345678901234567890',
      p256dh: 'A'.repeat(60),
      auth_secret: 'B'.repeat(24),
    }], error: null });
    const response = await POST(request({ title: 'Teste', body: 'Mensagem de teste', url: '/catalogo', mode: 'test' }));
    expect(response.status).toBe(200);
    expect(mocks.filterByOwner).toHaveBeenCalledWith('user_id', 'admin-id');
    expect(mocks.selectRows).toHaveBeenCalledWith(1);
    expect(mocks.sendNotification).toHaveBeenCalledOnce();
  });

  it('blocks general campaigns in Preview while allowing controlled tests', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    const response = await POST(request({ title: 'Novidade', body: 'Confira nossa seleção', url: '/catalogo', mode: 'campaign' }));
    expect(response.status).toBe(403);
    expect(mocks.selectRows).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });
});
