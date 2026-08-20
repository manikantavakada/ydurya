'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * The storefront's `<main>`.
 *
 * On the homepage it is pulled up by exactly the header's height so the first
 * editorial band runs underneath the transparent header — the photograph goes
 * genuinely edge to edge instead of starting below a bar. Every other route
 * keeps the normal flow.
 */
export function StoreMain({ children }: { children: React.ReactNode }) {
  const isHome = usePathname() === '/';

  return (
    <main
      id="main"
      className={cn(
        'flex-1 pb-[var(--bottom-nav-h)]',
        isHome && '-mt-[var(--header-h)]',
      )}
    >
      {children}
    </main>
  );
}
