import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/components/layout/Header.tsx',
    includes: ['href="/catalogo"', 'logo-allvino-header.png', 'shopping_bag'],
  },
  {
    file: 'src/components/layout/AppChrome.tsx',
    includes: ['isAdminRoute', "startsWith('/admin')", 'Header', 'Navbar', 'CartOverlay'],
  },
  {
    file: 'src/components/layout/Navbar.tsx',
    includes: ['href="/"', 'href="/catalogo"', 'href="/conta"', 'Início', 'Catálogo', 'Conta'],
  },
  {
    file: 'src/components/cart/CartOverlay.tsx',
    includes: ['Sua Seleção', 'Retirada na Loja', 'Ir para Pagamento', 'updateQuantity', 'removeFromCart'],
  },
  {
    file: 'src/app/catalogo/page.tsx',
    includes: ['Buscar por nome', 'Mais recentes', 'Menor preco', 'Limpar filtros', 'addToCart'],
  },
  {
    file: 'src/app/catalogo/[id]/page.tsx',
    includes: ['Adicionar ao carrinho', 'Continuar comprando', 'Voce tambem pode gostar', 'addManyToCart'],
  },
  {
    file: 'src/app/checkout/page.tsx',
    includes: ['552723453060', 'O pedido sera recebido em nosso WhatsApp', 'Pedido realizado', 'createOrder', 'fetchActivePromotionByCode', 'fetchDeliveryQuote', 'Consultar atendimento pelo WhatsApp', 'Cupom', 'CEP'],
  },
  {
    file: 'src/app/conta/page.tsx',
    includes: ['Meus Pedidos', 'Repetir pedido', 'Salvar Alteracoes', 'getUserOrders'],
  },
  {
    file: 'src/app/admin/layout.tsx',
    includes: ['admin-shell', 'max-w-[1680px]', 'Sidebar'],
  },
  {
    file: 'src/components/admin/AdminPrimitives.tsx',
    includes: ['AdminPageHeader', 'AdminStatCard', 'AdminSection', 'admin-surface'],
  },
  {
    file: 'src/app/admin/page.tsx',
    includes: ['AdminPageHeader', 'AdminStatCard', 'AdminSection', 'Inteligência Allvino'],
  },
  {
    file: 'src/app/admin/pedidos/page.tsx',
    includes: ['Buscar por cliente', 'Chamar no WhatsApp', 'Alterar status', 'statusCounts', 'promotion_code', 'shipping_fee', 'mark_manual_payment_paid', 'Marcar pagamento como pago'],
  },
  {
    file: 'src/app/admin/clientes/page.tsx',
    includes: ['Clientes', 'Base de clientes', 'Produto favorito', 'Chamar no WhatsApp', 'totalSpent'],
  },
  {
    file: 'src/app/admin/crm/page.tsx',
    includes: ['CRM Kanban', 'customer_crm_cards', 'moveCustomer', 'onDrop', 'Marcar contato realizado', 'Abrir WhatsApp'],
  },
  {
    file: 'src/app/admin/conversas/page.tsx',
    includes: ['Conversas', 'customer_conversations', 'customer_conversation_messages', 'Abrir WhatsApp', 'Salvar no historico'],
  },
  {
    file: 'supabase/migrations/20260611225128_add_customer_conversations.sql',
    includes: ['create table if not exists public.customer_conversations', 'create table if not exists public.customer_conversation_messages', 'Admins can manage customer conversations'],
  },
  {
    file: 'supabase/migrations/20260611223138_add_customer_crm_kanban.sql',
    includes: ['create table if not exists public.customer_crm_cards', 'stage in', 'priority in', 'Admins can manage customer crm cards'],
  },
  {
    file: 'src/components/admin/Sidebar.tsx',
    includes: ['href: \'/admin/crm\'', 'CRM Kanban', 'view_kanban', 'href: \'/admin/conversas\'', 'Conversas'],
  },
  {
    file: 'src/app/admin/estoque/page.tsx',
    includes: ['Estoque', 'Subir Excel', 'Codigo avulso', 'parseStockRows', 'importStockLevels'],
  },
  {
    file: 'src/app/admin/logistica/page.tsx',
    includes: ['Logistica & Frete', 'Nova Regiao', 'saveDeliveryZone', 'deleteDeliveryZone'],
  },
  {
    file: 'src/app/admin/promocoes/page.tsx',
    includes: ['Promocoes & Cupons', 'Novo Cupom', 'savePromotion', 'deletePromotion'],
  },
  {
    file: 'src/app/admin/catalogo/page.tsx',
    includes: ['allowedImageTypes', 'handleImageUpload', '/api/admin/produtos/imagem', 'image_url', 'Vinculo estoque', 'getStockLinkStatus', 'Codigo sem saldo'],
  },
  {
    file: 'src/app/api/admin/produtos/imagem/route.ts',
    includes: ['getBearerToken', "formData.get('accessToken')", 'Apenas administradores podem enviar imagens', "storage.from('produtos')", 'getPublicUrl', 'publicUrl'],
  },
  {
    file: 'src/app/api/pedidos/route.ts',
    includes: ['create_order_with_stock_reservation', 'p_cart_items', 'p_delivery_method', 'p_customer_name', 'stock_reserved_at'],
  },
  {
    file: 'scripts/checkout-rpc-check.mjs',
    includes: ['create_order_with_stock_reservation', 'checkout-test-cleanup', 'SUPABASE_ACCESS_TOKEN', 'stock_reserved'],
  },
  {
    file: 'supabase/migrations/20260602120000_create_atomic_checkout_rpc.sql',
    includes: ['app_private.create_order_with_stock_reservation', 'security definer', 'auth.uid()', 'checkout_items', 'grant execute on function public.create_order_with_stock_reservation'],
  },
  {
    file: 'supabase/migrations/20260602123000_fix_atomic_checkout_rpc_lint.sql',
    includes: ['create or replace function app_private.create_order_with_stock_reservation', 'parsed_items', 'checkout_items as', 'notify pgrst'],
  },
  {
    file: 'supabase/migrations/20260602130619_add_manual_payment_confirmation.sql',
    includes: ['mark_manual_payment_paid', 'public.is_admin()', "payment_status = 'paid'", 'paid_at'],
  },
  {
    file: 'src/lib/catalog/products.ts',
    includes: ['sku_sankhya', 'product_code', 'stock: Number', 'wineData.stock'],
  },
  {
    file: 'src/lib/database/stock.ts',
    includes: ['stock_levels', 'stock_imports', 'upsertStockRows', 'sku_sankhya', 'fetchStockLevelsByCodes'],
  },
  {
    file: 'supabase/migrations/20260531000033_add_promotions.sql',
    includes: ['create table if not exists public.promotions', 'enable row level security', 'Public can read active promotions', 'Admins can manage promotions'],
  },
  {
    file: 'supabase/migrations/20260531002906_add_delivery_zones.sql',
    includes: ['create table if not exists public.delivery_zones', 'shipping_fee', 'Public can read active delivery zones', 'Admins can manage delivery zones'],
  },
  {
    file: 'supabase/migrations/20260531120430_seed_initial_delivery_zones.sql',
    includes: ['Vitoria', 'Vila Velha', 'Cariacica', 'Serra', 'Guarapari', 'where not exists'],
  },
  {
    file: 'supabase/migrations/20260531123314_add_customer_crm_and_stock_reservation.sql',
    includes: ['create table if not exists public.stock_levels', 'stock_reserved_at', 'get_stock_levels_for_codes', 'app_private.reserve_product_stock_for_order', 'Estoque insuficiente'],
  },
  {
    file: '.github/workflows/ci.yml',
    includes: ['npm run build', 'supabase db push', 'vercel deploy --prod'],
  },
];

const mojibakePatterns = [
  String.fromCharCode(0x00c3),
  String.fromCharCode(0x00e2, 0x20ac, 0x00a2),
  String.fromCharCode(0x00e2, 0x20ac, 0x20ac),
  String.fromCharCode(0xfffd),
];
const sourceExtensions = /\.(ts|tsx|mjs|json|md|yml)$/;
const sourceRoots = ['src', 'scripts', '.github', 'supabase/migrations', 'package.json', 'DEPLOYMENT.md'];
const failures = [];

function readProjectFile(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: arquivo nao encontrado`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

for (const check of checks) {
  const content = readProjectFile(check.file);

  for (const expected of check.includes) {
    if (!content.includes(expected)) {
      failures.push(`${check.file}: trecho obrigatorio ausente: ${expected}`);
    }
  }
}

function scanPath(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) return;

  if (sourceExtensions.test(relativePath)) {
    const content = readProjectFile(relativePath);
    for (const pattern of mojibakePatterns) {
      if (content.includes(pattern)) {
        failures.push(`${relativePath}: possivel texto com encoding quebrado (${pattern})`);
      }
    }
  }
}

for (const target of sourceRoots) {
  if (target.includes('.')) {
    scanPath(target);
    continue;
  }

  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    const absolutePath = join(root, current);
    if (!existsSync(absolutePath)) continue;

    const currentStat = statSync(absolutePath);
    if (currentStat.isDirectory()) {
      for (const entry of readdirSync(absolutePath)) {
        stack.push(join(current, entry));
      }
      continue;
    }

    scanPath(current);
  }
}

if (failures.length > 0) {
  console.error('Smoke check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Smoke check passed (${checks.length} feature guards).`);
