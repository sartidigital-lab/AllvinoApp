import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

const requiredFiles = [
  {
    file: 'src/app/checkout/page.tsx',
    includes: [
      'createPaymentCheckout',
      'window.location.assign(paymentUrl)',
      'IR PARA PAGAMENTO PIX',
      'IR PARA PAGAMENTO SEGURO',
      'checkout seguro da Stone/Pagar.me',
      "trackConversionEvent('order_created'",
      "trackConversionEvent('checkout_started'",
    ],
    excludes: [
      'buildCheckoutWhatsAppMessage',
      'SOLICITAR LINK NO WHATSAPP',
      "window.open('about:blank', '_blank')",
    ],
  },
  {
    file: 'src/app/api/pedidos/route.ts',
    includes: ['create_order_with_stock_reservation', 'p_marketing_consent', 'buildTrackingContext'],
  },
  // Tracking guards: a build that drops the Meta/Google purchase tracking must
  // fail instead of silently replacing production.
  {
    file: 'src/lib/analytics/dispatchPurchase.ts',
    includes: ['graph.facebook.com', 'META_CAPI_ACCESS_TOKEN', 'google-analytics.com/mp/collect', 'marketing_consent_at'],
  },
  {
    file: 'src/lib/analytics/purchaseEvents.ts',
    includes: ["event_name: 'Purchase'", "name: 'purchase'", 'event_id: order.id'],
  },
  {
    file: 'src/components/analytics/MetaPixel.tsx',
    includes: ['allvino:conversion', 'fbq(', 'trackCustom'],
  },
  {
    file: 'src/lib/analytics/attribution.ts',
    includes: ['allvino_attr', 'gclid', 'fbclid', 'classifyChannel'],
  },
  {
    file: 'src/components/layout/CustomerOnlyExperience.tsx',
    includes: ['AttributionCapture'],
  },
  {
    file: 'src/components/analytics/GoogleTagManager.tsx',
    includes: ['G-F5T9JS9VYQ', 'AW-18556930168'],
  },
  {
    file: 'src/lib/analytics/conversionEvents.ts',
    includes: ['trackConversionEvent', 'allvino:conversion'],
  },
  {
    file: 'src/app/catalogo/page.tsx',
    includes: ["trackConversionEvent('catalog_view'", "trackConversionEvent('add_to_cart'"],
  },
  {
    file: 'supabase/migrations/20261117190000_add_order_tracking_context.sql',
    includes: ['tracking_context', 'ga4_purchase_sent_at'],
  },
  {
    file: 'src/lib/database/payments.ts',
    includes: ['/api/pagamentos/checkout'],
  },
  {
    file: 'src/app/api/pagamentos/checkout/route.ts',
    includes: ['createPagarmePaymentLink', 'createAdminClient', 'begin_pagarme_payment'],
  },
  {
    file: 'src/app/api/pagamentos/webhook/route.ts',
    includes: ['process_pagarme_webhook', 'verifyPagarmeWebhook', 'dispatchPurchaseTracking'],
  },
  {
    file: 'src/lib/payments/pagarme.ts',
    includes: ["import 'server-only'", 'PAGARME_SECRET_KEY', '/paymentlinks'],
  },
  {
    file: 'supabase/migrations/20261020212113_add_pagarme_hosted_checkout.sql',
    includes: ['begin_pagarme_payment', 'complete_pagarme_payment', 'process_pagarme_webhook'],
  },
  {
    file: 'supabase/migrations/20261020212145_order_payment_shipping_statuses.sql',
    includes: ['prevent_unpaid_pagarme_fulfillment', "new.payment_status = 'cancelled'"],
  },
  {
    file: 'supabase/migrations/20261110170000_add_meta_purchase_tracking.sql',
    includes: ['p_marketing_consent boolean default false', "notify pgrst, 'reload schema'"],
  },
];

for (const requirement of requiredFiles) {
  const path = join(root, requirement.file);
  if (!existsSync(path)) {
    failures.push(`${requirement.file}: arquivo obrigatorio ausente`);
    continue;
  }

  const content = readFileSync(path, 'utf8');
  for (const expected of requirement.includes) {
    if (!content.includes(expected)) failures.push(`${requirement.file}: trecho obrigatorio ausente: ${expected}`);
  }
  for (const forbidden of requirement.excludes ?? []) {
    if (content.includes(forbidden)) failures.push(`${requirement.file}: fluxo legado encontrado: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error('Payment gateway guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Payment gateway guard passed (${requiredFiles.length} integrity checks).`);
