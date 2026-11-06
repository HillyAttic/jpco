'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

interface PrototypeSwitcherProps {
  variants: string[];
  current: string;
  names?: Record<string, string>;
}

export function PrototypeSwitcher({ variants, current, names }: PrototypeSwitcherProps) {
  if (process.env.NODE_ENV === 'production') return null;

  const router = useRouter();
  const searchParams = useSearchParams();

  const idx = Math.max(0, variants.indexOf(current));
  const go = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('variant', next);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const prev = () => go(variants[(idx - 1 + variants.length) % variants.length]);
  const next = () => go(variants[(idx + 1) % variants.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const label = names?.[current] ? `${current} · ${names[current]}` : current;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-full bg-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
      <button onClick={prev} aria-label="Previous variant" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10">
        ←
      </button>
      <span className="text-sm font-medium tabular-nums min-w-[120px] text-center">{label}</span>
      <button onClick={next} aria-label="Next variant" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10">
        →
      </button>
    </div>
  );
}