import { SiteHeader, type HeaderNavItem } from '@/components/store/site-header';
import { SiteFooter } from '@/components/store/site-footer';
import { BottomNav } from '@/components/store/bottom-nav';
import { StoreMain } from '@/components/store/store-main';
import { CategoryService } from '@/services/category.service';
import { HomepageService } from '@/services/homepage.service';
import { WishlistService } from '@/services/wishlist.service';
import { getCurrentUser } from '@/lib/auth/session';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
import type { CategoryDTO } from '@/types';

/**
 * Storefront shell.
 *
 * Navigation is built on the server from real categories, so the header is in
 * the initial HTML — nothing to fetch, nothing to shift after hydration.
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, navCandidates, user, sections] = await Promise.all([
    CategoryService.listVisible(),
    CategoryService.navCandidates(),
    getCurrentUser(),
    HomepageService.getSections(),
  ]);

  // The header sits over the first band while the homepage is at the top of
  // the page, so it has to take its contrast from that artwork: YDURYA's
  // campaign photography is bright, which needs ink type, not white.
  const overlayTheme = sections[0]?.theme === 'DARK' ? 'DARK' : 'LIGHT';

  const wishlistCount = user ? (await WishlistService.productIds(user.id)).length : 0;

  const bySlug = new Map(navCandidates.map((c) => [c.slug, c]));

  /** Categories a live homepage band links to — the brand is promoting these now. */
  const promoted = new Set(
    sections
      .map((s) => s.href.match(/^\/category\/([a-z0-9-]+)/)?.[1])
      .filter((slug): slug is string => Boolean(slug)),
  );

  /**
   * Garment categories in the order the brand leads with. A category earns a
   * header slot when it has stock or a live campaign band, so the header never
   * points somewhere empty and unadvertised — nor misses somewhere the
   * homepage is actively sending people.
   */
  const primary: { slug: string; label: string }[] = [
    { slug: 'shirts', label: 'Shirts' },
    { slug: 'polos', label: 'Polos' },
    { slug: 'jackets', label: 'Jackets' },
    { slug: 'hoodies', label: 'Hoodies' },
    { slug: 't-shirts', label: 'T-Shirts' },
    { slug: 'kurtas', label: 'Kurta' },
    { slug: 'bottoms', label: 'Bottoms' },
  ];

  const occasion: CategoryDTO[] = categories.filter((c) =>
    ['casual-wear', 'weekend-stylish', 'exam-wear', 'interview-wear', 'parties-fests', 'sports-wear'].includes(c.slug),
  );

  const navItems: HeaderNavItem[] = [
    ...primary
      .filter((p) => {
        const category = bySlug.get(p.slug);
        return category && (category.productCount > 0 || promoted.has(p.slug));
      })
      .map((p) => ({ label: p.label, href: `/category/${p.slug}` })),
    { label: 'Shop All', href: '/shop' },
    ...(occasion.length ? [{ label: 'College Wear', href: '/shop', children: occasion }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        navItems={navItems}
        isSignedIn={Boolean(user)}
        wishlistCount={wishlistCount}
        overlayTheme={overlayTheme}
      />

      <StoreMain>{children}</StoreMain>

      <SiteFooter />
      <BottomNav isSignedIn={Boolean(user)} />
      <OrganizationJsonLd />
    </div>
  );
}
