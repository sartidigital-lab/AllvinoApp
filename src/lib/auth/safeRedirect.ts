const allowedRedirects = new Set(['/', '/catalogo', '/cupons', '/favoritos', '/checkout', '/conta', '/admin', '/recuperar-senha', '/admin/catalogo', '/admin/clientes', '/admin/conversas', '/admin/crm', '/admin/equipe', '/admin/estoque', '/admin/kits', '/admin/logistica', '/admin/notificacoes', '/admin/pedidos', '/admin/perfil', '/admin/promocoes']);

export function safeInternalRedirect(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  const pathname = value.split('?')[0].split('#')[0];
  if (allowedRedirects.has(pathname) || /^\/(?:catalogo|selecao)\/[a-zA-Z0-9_-]+$/.test(pathname)) return value;
  return fallback;
}
