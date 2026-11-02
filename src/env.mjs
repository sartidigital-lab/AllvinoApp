import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_PIX_KEY: z.string().trim().min(1).optional(),
    NEXT_PUBLIC_PIX_MERCHANT_NAME: z.string().trim().min(1).max(25).optional(),
    NEXT_PUBLIC_PIX_MERCHANT_CITY: z.string().trim().min(1).max(15).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_PIX_KEY: process.env.NEXT_PUBLIC_PIX_KEY,
    NEXT_PUBLIC_PIX_MERCHANT_NAME: process.env.NEXT_PUBLIC_PIX_MERCHANT_NAME,
    NEXT_PUBLIC_PIX_MERCHANT_CITY: process.env.NEXT_PUBLIC_PIX_MERCHANT_CITY,
  },
});
