import { z } from 'zod';

const key = 'allvino:checkout-auth-draft:v1';
const text = z.string().max(250);
const draftSchema = z.object({
  savedAt: z.number(),
  entrega: z.enum(['entrega', 'retirada']),
  address: z.object({ logradouro: text, numero: text, bairro: text, localidade: text, uf: text }),
  cep: z.string().max(16),
  pagamento: z.enum(['Pix', 'Cartao (Link)']),
  installments: z.number().int().min(1).max(12),
  promotionCode: z.string().max(100),
  promotionApplied: z.boolean(),
});
export type CheckoutDraft = z.infer<typeof draftSchema>;

export function saveCheckoutDraft(storage: Storage, draft: CheckoutDraft) {
  try { storage.setItem(key, JSON.stringify(draft)); } catch { /* Checkout remains usable without storage. */ }
}

export function takeCheckoutDraft(storage: Storage, now = Date.now()): CheckoutDraft | null {
  try {
    const raw = storage.getItem(key);
    storage.removeItem(key);
    if (!raw) return null;
    const result = draftSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.savedAt > now || now - result.data.savedAt > 60 * 60 * 1000) return null;
    return result.data;
  } catch { return null; }
}
