import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const orders = read('src/lib/database/orders.ts');
const upload = read('src/app/api/admin/produtos/imagem/route.ts');
const migration = read('supabase/migrations/20260714120000_harden_product_visibility_and_checkout.sql');
const checkoutHardening = read('supabase/migrations/20260813213000_harden_checkout_and_stock_consistency.sql');
const stock = read('src/lib/database/stock.ts');
const headers = read('next.config.mjs');

assert.doesNotMatch(orders, /\.from\(['"]orders['"]\)\.insert/);
assert.match(orders, /fetch\(['"]\/api\/pedidos['"]/, 'order creation must use the server API');
assert.match(upload, /getBearerToken/);
assert.match(upload, /maxImageBytes/);
assert.match(upload, /hasValidImageSignature/);
assert.match(migration, /publicado = true or public\.is_admin\(\)/);
assert.match(migration, /enforce_published_order_item/);
assert.match(checkoutHardening, /revoke insert on public\.orders from authenticated/);
assert.match(checkoutHardening, /revoke insert on public\.order_items from authenticated/);
assert.match(checkoutHardening, /Modalidade de entrega invalida/);
assert.match(checkoutHardening, /new\.product_name := v_product_name/);
assert.match(checkoutHardening, /set_manual_stock_level/);
assert.match(stock, /rpc\(['"]set_manual_stock_level['"]/);
assert.match(headers, /Content-Security-Policy/);
assert.match(headers, /Strict-Transport-Security/);

console.log('Security checks passed.');
