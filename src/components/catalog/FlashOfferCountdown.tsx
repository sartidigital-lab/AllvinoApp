'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let intervalId: number | null = null;

function emitTimeChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToClock(listener: () => void) {
  listeners.add(listener);
  if (intervalId === null) intervalId = window.setInterval(emitTimeChange, 1_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getCurrentSecond() {
  return Math.floor(Date.now() / 1_000);
}

function getRemaining(endAt: string, nowInSeconds: number) {
  const remaining = Math.max(0, new Date(endAt).getTime() - nowInSeconds * 1_000);
  const totalSeconds = Math.floor(remaining / 1_000);
  return {
    remaining,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function FlashOfferCountdown({ endsAt }: { endsAt: string | null | undefined }) {
  const nowInSeconds = useSyncExternalStore(subscribeToClock, getCurrentSecond, getCurrentSecond);
  if (!endsAt) return null;

  const time = getRemaining(endsAt, nowInSeconds);
  if (time.remaining <= 0) return null;

  const formatted = [
    time.days > 0 ? `${time.days}d` : null,
    `${String(time.hours).padStart(2, '0')}h`,
    `${String(time.minutes).padStart(2, '0')}min`,
    `${String(time.seconds).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ');

  return (
    <p className="inline-flex items-center gap-1.5 rounded-md bg-[#f23c45] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
      <span aria-hidden="true">ϟ</span> Oferta relâmpago · {formatted}
    </p>
  );
}
