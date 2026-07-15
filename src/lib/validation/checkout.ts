import { z } from 'zod';

const checkoutItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(50),
});

export const checkoutRequestSchema = z.object({
  cartItems: z.array(checkoutItemSchema).min(1).max(50),
  deliveryMethod: z.string()
    .refine((value) => value === 'Retirada na Loja' || value.startsWith('Entrega no '))
    .transform((value) => value === 'Retirada na Loja' ? 'Retirada na Loja' : 'Entrega no Endereco'),
  paymentMethod: z.enum(['Pix', 'Cartao (Link)', 'Cartao (Maquininha)']),
  deliveryAddress: z.string().trim().max(500).nullable().optional(),
  promotionCode: z.string().trim().max(40).nullable().optional(),
  deliveryZipCode: z.string().regex(/^\d{8}$/).nullable().optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
