import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const tokenFile = '.supabase-token.local';
const accessToken =
  process.env.SUPABASE_ACCESS_TOKEN ||
  (existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '');

if (!accessToken) {
  throw new Error(
    'SUPABASE_ACCESS_TOKEN is required. Set it in the environment or create .supabase-token.local.'
  );
}

const env = { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken };

function shellQuote(value) {
  const text = String(value);
  if (!/[ \t\n\r"&|<>^]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function compactSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function extractFirstJsonObject(output) {
  const start = output.indexOf('{');
  if (start < 0) throw new Error(`Supabase CLI did not return JSON:\n${output}`);

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let index = start; index < output.length; index += 1) {
    const char = output[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return output.slice(start, index + 1);
    }
  }

  throw new Error(`Could not parse Supabase CLI JSON output:\n${output}`);
}

function queryRows(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'allvino-checkout-rpc-'));
  const queryFile = join(tempDir, 'query.sql');
  writeFileSync(queryFile, `${compactSql(sql)}\n`, 'utf8');

  try {
    const cliArgs = ['supabase', 'db', 'query', '--linked', '--output', 'json', '--file', queryFile];
    const output =
      process.platform === 'win32'
        ? execFileSync('cmd.exe', ['/d', '/s', '/c', ['npx.cmd', ...cliArgs].map(shellQuote).join(' ')], {
            cwd: process.cwd(),
            env,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : execFileSync('npx', cliArgs, {
            cwd: process.cwd(),
            env,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          });

    const payload = JSON.parse(extractFirstJsonObject(output));
    return payload.rows || [];
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function firstRow(sql, label) {
  const rows = queryRows(sql);
  if (rows.length === 0) throw new Error(`${label} not found.`);
  return rows[0];
}

const userId =
  process.env.CHECKOUT_TEST_USER_ID ||
  firstRow(
    'select id from auth.users order by created_at desc limit 1;',
    'Checkout test user'
  ).id;

const product =
  process.env.CHECKOUT_TEST_PRODUCT_ID
    ? firstRow(
        `
          select
            p.id,
            p.nome,
            p.preco,
            p.sku_sankhya,
            coalesce(s.quantity, -1) as stock_quantity
          from public.produtos p
          left join public.stock_levels s on s.product_code = trim(p.sku_sankhya)
          where p.id = ${sqlString(process.env.CHECKOUT_TEST_PRODUCT_ID)}
          limit 1;
        `,
        'Checkout test product'
      )
    : firstRow(
        `
          select
            p.id,
            p.nome,
            p.preco,
            p.sku_sankhya,
            coalesce(s.quantity, -1) as stock_quantity
          from public.produtos p
          join public.stock_levels s on s.product_code = trim(p.sku_sankhya)
          where nullif(trim(p.sku_sankhya), '') is not null
            and s.quantity > 0
          order by s.quantity desc
          limit 1;
        `,
        'Checkout test product with stock'
      );

if (Number(product.stock_quantity) <= 0) {
  throw new Error(`Checkout test product has no stock: ${product.id}`);
}

const quantity = Number(process.env.CHECKOUT_TEST_QUANTITY || 1);
if (!Number.isInteger(quantity) || quantity <= 0) {
  throw new Error('CHECKOUT_TEST_QUANTITY must be a positive integer.');
}

const created = firstRow(
  `
    with claims as (
      select set_config('request.jwt.claim.sub', ${sqlString(userId)}, true)
    )
    select public.create_order_with_stock_reservation(
      jsonb_build_array(
        jsonb_build_object(
          'id', ${sqlString(product.id)},
          'name', ${sqlString(product.nome)},
          'quantity', ${quantity}
        )
      ),
      'Retirada na Loja',
      'Pix',
      null,
      null,
      null,
      'Teste Checkout Allvino',
      '27999999999'
    ) as order_id
    from claims;
  `,
  'Created checkout test order'
);

const orderId = created.order_id;

try {
  const details = firstRow(
    `
      select
        o.id,
        o.status,
        o.total_amount,
        o.subtotal_amount,
        o.discount_amount,
        o.shipping_fee,
        o.payment_provider,
        o.payment_status,
        o.delivery_type,
        o.stock_reserved_at is not null as stock_reserved,
        oi.product_id,
        oi.quantity,
        oi.unit_price
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.id = ${sqlString(orderId)};
    `,
    'Checkout test order details'
  );

  const expectedSubtotal = Number(product.preco) * quantity;
  const expectedDiscount = Number((expectedSubtotal * 0.1).toFixed(2));
  const expectedTotal = Number((expectedSubtotal - expectedDiscount).toFixed(2));
  const actualTotal = Number(details.total_amount);
  const actualSubtotal = Number(details.subtotal_amount);
  const actualDiscount = Number(details.discount_amount);

  const failures = [];
  if (details.status !== 'pending') failures.push(`status=${details.status}`);
  if (details.payment_provider !== 'manual') failures.push(`payment_provider=${details.payment_provider}`);
  if (details.payment_status !== 'pending') failures.push(`payment_status=${details.payment_status}`);
  if (details.delivery_type !== 'Retirada na Loja') failures.push(`delivery_type=${details.delivery_type}`);
  if (!details.stock_reserved) failures.push('stock_reserved=false');
  if (details.product_id !== product.id) failures.push(`product_id=${details.product_id}`);
  if (Number(details.quantity) !== quantity) failures.push(`quantity=${details.quantity}`);
  if (Math.abs(actualSubtotal - expectedSubtotal) > 0.001) failures.push(`subtotal=${details.subtotal_amount}`);
  if (Math.abs(actualDiscount - expectedDiscount) > 0.001) failures.push(`discount=${details.discount_amount}`);
  if (Math.abs(actualTotal - expectedTotal) > 0.001) failures.push(`total=${details.total_amount}`);

  if (failures.length > 0) {
    throw new Error(`Checkout RPC verification failed: ${failures.join(', ')}`);
  }

  console.log('Checkout RPC verification passed.');
  console.log(
    JSON.stringify(
      {
        order_id: orderId,
        product: product.nome,
        sku: product.sku_sankhya,
        quantity,
        subtotal: actualSubtotal,
        discount: actualDiscount,
        total: actualTotal,
        payment_provider: details.payment_provider,
        payment_status: details.payment_status,
        stock_reserved: details.stock_reserved,
      },
      null,
      2
    )
  );
} finally {
  const cleanup = firstRow(
    `
      with test_items as materialized (
        select
          o.id as order_id,
          oi.product_id,
          trim(p.sku_sankhya) as product_code,
          oi.quantity
        from public.orders o
        join public.order_items oi on oi.order_id = o.id
        join public.produtos p on p.id = oi.product_id
        where o.id = ${sqlString(orderId)}
          and o.stock_reserved_at is not null
      ),
      restore_stock as (
        update public.stock_levels s
          set quantity = s.quantity + totals.quantity,
              updated_at = now(),
              source = 'checkout-test-cleanup'
        from (
          select product_code, sum(quantity)::integer as quantity
          from test_items
          group by product_code
        ) totals
        where s.product_code = totals.product_code
        returning s.product_code
      ),
      restore_products as (
        update public.produtos p
          set estoque = p.estoque + totals.quantity
        from (
          select product_id, sum(quantity)::integer as quantity
          from test_items
          group by product_id
        ) totals
        where p.id = totals.product_id
        returning p.id
      ),
      deleted_orders as (
        delete from public.orders o
        where o.id = ${sqlString(orderId)}
        returning o.id
      )
      select
        coalesce((select sum(quantity) from test_items), 0)::integer as restored_quantity,
        (select count(*) from deleted_orders)::integer as deleted_orders,
        exists(select 1 from restore_stock) as stock_restored,
        exists(select 1 from restore_products) as product_stock_restored;
    `,
    'Checkout test cleanup'
  );

  if (Number(cleanup.deleted_orders) !== 1) {
    throw new Error(`Checkout test cleanup did not delete order ${orderId}.`);
  }
}
