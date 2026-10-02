import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

const productIdSchema = z.uuid();
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };
type ReviewState = { can_review: boolean; rating: number | null; comment: string | null };
type SubmittedReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};
type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};
type ReviewSummary = { review_count: number; average_rating: number | null };

function invalidProductResponse() {
  return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) return invalidProductResponse();

  const supabase = await createClient();
  const [reviewsResult, summaryResult, userResult] = await Promise.all([
    supabase.rpc('get_product_review_feed', { p_product_id: id }),
    supabase.rpc('get_product_review_summary', { p_product_id: id }).single(),
    supabase.auth.getUser(),
  ]);

  if (reviewsResult.error || summaryResult.error) {
    return NextResponse.json({ error: 'Não foi possível carregar as avaliações.' }, { status: 500 });
  }

  let viewer = {
    isAuthenticated: Boolean(userResult.data.user && !userResult.error),
    canReview: false,
    review: null as { rating: number; comment: string | null } | null,
  };

  if (userResult.data.user && !userResult.error) {
    const { data: reviewState, error: reviewStateError } = await supabase
      .rpc('get_product_review_state', { p_product_id: id })
      .single();

    if (reviewStateError) {
      return NextResponse.json({ error: 'Não foi possível verificar a sua compra.' }, { status: 500 });
    }

    const state = reviewState as ReviewState;
    viewer = {
      isAuthenticated: true,
      canReview: state.can_review === true,
      review: state.rating === null
        ? null
        : { rating: Number(state.rating), comment: state.comment || null },
    };
  }

  return NextResponse.json({
    reviews: (reviewsResult.data || []) as PublicReview[],
    summary: {
      reviewCount: Number((summaryResult.data as ReviewSummary | null)?.review_count || 0),
      averageRating: Number((summaryResult.data as ReviewSummary | null)?.average_rating || 0),
    },
    viewer,
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) return invalidProductResponse();

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Faça login para avaliar este produto.' }, { status: 401 });
  }

  const limit = await checkRateLimitDistributed(getClientKey(request, 'product-review', user.id), 5, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados da avaliação inválidos.' }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Escolha uma nota de 1 a 5 e use até 500 caracteres no comentário.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('submit_product_review', {
    p_product_id: id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || null,
  }).single();

  if (error) {
    const message = error.message || '';
    if (message.includes('exclusiva para clientes')) {
      return NextResponse.json({ error: 'A avaliação é exclusiva para clientes que compraram este produto.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Não foi possível salvar a avaliação.' }, { status: 500 });
  }

  const review = data as SubmittedReview;
  return NextResponse.json({
    review: {
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment || null,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    },
  });
}
