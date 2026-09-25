"use client";

import { useEffect, useState } from 'react';

function getRemaining(endAt: string) {
  const remaining = Math.max(0, new Date(endAt).getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    remaining,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function FlashOfferCountdown({ endsAt }: { endsAt: string | null | undefined }) {
  const [time, setTime] = useState(() => endsAt ? getRemaining(endsAt) : null);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setTime(getRemaining(endsAt));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  if (!time || time.remaining <= 0) return null;

  const formatted = [
    time.days > 0 ? `${time.days}d` : null,
    `${String(time.hours).padStart(2, '0')}h`,
    `${String(time.minutes).padStart(2, '0')}min`,
    `${String(time.seconds).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ');

  return (
    <p className="inline-flex items-center gap-1.5 rounded-md bg-[#f23c45] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white" aria-live="polite">
      <span aria-hidden="true">ϟ</span> Oferta relâmpago · {formatted}
    </p>
  );
}
