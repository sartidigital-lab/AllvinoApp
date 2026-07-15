import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const orders = read('src/lib/database/orders.ts');
const upload = read('src/app/api/admin/produtos/imagem/route.ts');
const migration = read('supabase/migrations/20260714120000_harden_product_visibility_and_checkout.sql');
const headers = read('next.config.mjs');

assert.doesNotMatch(orders, /\.from\(['"]orders['"]\)\.insert/);
assert.match(orders, /fetch\(['"]\/api\/pedidos['"]/, 'order creation must use the server API');
assert.match(upload, /getBearerToken/);
assert.match(upload, /maxImageBytes/);
assert.match(upload, /hasValidImageSignature/);
assert.match(migration, /publicado = true or public\.is_admin\(\)/);
assert.match(migration, /enforce_published_order_item/);
assert.match(headers, /Content-Security-Policy/);
assert.match(headers, /Strict-Transport-Security/);

console.log('Security checks passed.');
