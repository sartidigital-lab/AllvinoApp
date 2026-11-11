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
    ],
    excludes: [
      'buildCheckoutWhatsAppMessage',
      'SOLICITAR LINK NO WHATSAPP',
      "window.open('about:blank', '_blank')",
    ],
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
    includes: ['process_pagarme_webhook', 'verifyPagarmeWebhook'],
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
