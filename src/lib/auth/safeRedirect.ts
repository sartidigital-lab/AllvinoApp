const allowedRedirects = new Set(['/', '/checkout', '/conta', '/admin']);

export function safeInternalRedirect(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;

  const pathname = value.split('?')[0].split('#')[0];
  return allowedRedirects.has(pathname) ? value : fallback;
}
