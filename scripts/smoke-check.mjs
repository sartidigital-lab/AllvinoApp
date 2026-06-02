import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/components/layout/Header.tsx',
    includes: ['href="/catalogo"', 'logo-allvino-header.png', 'shopping_bag'],
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
    file: 'src/app/admin/pedidos/page.tsx',
    includes: ['Buscar por cliente', 'Chamar no WhatsApp', 'Alterar status', 'statusCounts', 'promotion_code', 'shipping_fee'],
  },
  {
    file: 'src/app/admin/clientes/page.tsx',
    includes: ['Clientes', 'Base de clientes', 'Produto favorito', 'Chamar no WhatsApp', 'totalSpent'],
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
    includes: ['allowedImageTypes', 'handleImageUpload', 'storage.from', 'image_url', 'Vinculo estoque', 'getStockLinkStatus', 'Codigo sem saldo'],
  },
  {
    file: 'src/app/api/pedidos/route.ts',
    includes: ['productsById', 'subtotal', 'promotionCode', 'deliveryZipCode', 'get_stock_levels_for_codes', 'reserve_product_stock_for_order', 'total'],
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
