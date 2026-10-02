"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewPayload = {
  reviews: Review[];
  summary: { reviewCount: number; averageRating: number };
  viewer: {
    isAuthenticated: boolean;
    canReview: boolean;
    review: { rating: number; comment: string | null } | null;
  };
};

function RatingStars({ rating, label, size = 'h-4 w-4' }: { rating: number; label: string; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={label} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(value));
}

export function ProductReviews({ productId }: { productId: string }) {
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/catalogo/${productId}/avaliacoes`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await response.json() as ReviewPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as avaliações.');

      setPayload(data);
      setRating(data.viewer.review?.rating || 0);
      setComment(data.viewer.review?.comment || '');
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível carregar as avaliações.' });
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating) {
      setMessage({ tone: 'danger', text: 'Escolha uma nota de 1 a 5 estrelas.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/catalogo/${productId}/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a avaliação.');

      setMessage({ tone: 'success', text: 'Sua avaliação foi salva.' });
      await loadReviews();
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível salvar a avaliação.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectTo = encodeURIComponent(`/catalogo/${productId}`);

  return (
    <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-labelledby="reviews-title">
      <div className="rounded-brand-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-100 pb-5">
          <div>
            <h2 id="reviews-title" className="font-serif text-2xl font-bold">Avaliações</h2>
            <p className="mt-1 text-sm text-stone-500">Opiniões de clientes com compra confirmada.</p>
          </div>
          {payload && payload.summary.reviewCount > 0 && (
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <strong className="text-xl">{payload.summary.averageRating.toFixed(1).replace('.', ',')}</strong>
                <RatingStars rating={payload.summary.averageRating} label={`Média de ${payload.summary.averageRating.toFixed(1)} em 5`} />
              </div>
              <p className="text-xs font-medium text-stone-500">{payload.summary.reviewCount} {payload.summary.reviewCount === 1 ? 'avaliação' : 'avaliações'}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="py-8 text-sm font-medium text-stone-400">Carregando avaliações...</p>
        ) : payload?.reviews.length ? (
          <div className="divide-y divide-stone-100">
            {payload.reviews.map((review) => (
              <article key={review.id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} label={`${review.rating} de 5 estrelas`} />
                    <span className="text-sm font-bold text-stone-800">Cliente verificado</span>
                  </div>
                  <time dateTime={review.created_at} className="text-xs text-stone-400">{formatReviewDate(review.created_at)}</time>
                </div>
                {review.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{review.comment}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-stone-500">Este produto ainda não tem avaliações. Seja o primeiro cliente a avaliar.</p>
        )}
      </div>

      <aside className="h-fit rounded-brand-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6" aria-labelledby="review-form-title">
        <h2 id="review-form-title" className="font-serif text-xl font-bold">Avalie este produto</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-stone-500">Verificando se você pode avaliar...</p>
        ) : !payload?.viewer.isAuthenticated ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">
            <a href={`/?login=true&redirectTo=${redirectTo}`} className="font-bold text-brand-primary hover:underline">Entre na sua conta</a>{' '}
            para avaliar produtos que você comprou.
          </p>
        ) : !payload.viewer.canReview ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">A avaliação é liberada após a confirmação do pagamento de um pedido que inclua este produto.</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={submitReview}>
            <fieldset>
              <legend className="text-sm font-bold text-stone-800">Sua nota</legend>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                    aria-pressed={rating === star}
                  >
                    <Star className={`h-7 w-7 transition ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 hover:text-amber-400'}`} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor={`review-comment-${productId}`} className="text-sm font-bold text-stone-800">Comentário <span className="font-normal text-stone-500">(opcional)</span></label>
              <textarea
                id={`review-comment-${productId}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Conte como foi sua experiência com este produto."
                className="mt-2 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
              />
              <p className="mt-1 text-right text-xs text-stone-400">{comment.length}/500</p>
            </div>
            {message && <p role="status" className={`text-sm font-medium ${message.tone === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-brand-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-primary-hover disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : payload.viewer.review ? 'Atualizar avaliação' : 'Publicar avaliação'}
            </button>
          </form>
        )}
        {!isLoading && (!payload || !payload.viewer.canReview) && message && <p role="status" className={`mt-4 text-sm font-medium ${message.tone === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
      </aside>
    </section>
  );
}
