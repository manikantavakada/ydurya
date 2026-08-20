/**
 * Default homepage composition.
 *
 * This is the *seed* for `HomepageSection`, not the runtime source — once
 * seeded, the homepage is driven entirely by the database so it can be edited
 * in Admin → Homepage without a deploy.
 *
 * ── Artwork ────────────────────────────────────────────────────────────────
 * Each band expects two crops, because a 16:9 landscape composition rarely
 * survives being squeezed into a 9:16 phone frame:
 *
 *   public/images/home/<key>-desktop.jpg   →  16:9  (2400×1350 recommended)
 *   public/images/home/<key>-mobile.jpg    →  9:16  (1080×1920 recommended)
 *
 * Drop files at those exact paths and they appear automatically — the renderer
 * checks whether the file exists and falls back to a labelled placeholder when
 * it does not. Uploading through the admin panel works too and overrides these.
 *
 * ── Wording ────────────────────────────────────────────────────────────────
 * `textMode: 'IMAGE'` means the artwork already carries its own wording
 * ("FRESH ARRIVALS", "+ SHOP NOW"), so nothing is drawn on top of it. The
 * `title` and `ctaLabel` below are still required: they become the accessible
 * name of the link and a visually-hidden heading, so the section remains
 * crawlable and usable with a screen reader. Switch a section to `'OVERLAY'`
 * in the admin to have the app render the words instead.
 */

export type SectionTextMode = 'IMAGE' | 'OVERLAY';
export type SectionTextAlign = 'CENTER' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT' | 'TOP_LEFT';
export type SectionTheme = 'LIGHT' | 'DARK';

export interface HomepageSectionSeed {
  key: string;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  href: string;
  desktopImage?: string | null;
  mobileImage?: string | null;
  imageAlt?: string | null;
  focalDesktop?: string;
  focalMobile?: string;
  textMode?: SectionTextMode;
  textAlign?: SectionTextAlign;
  theme?: SectionTheme;
  overlayStrength?: number;
  showProductRail?: boolean;
  railSource?: string | null;
  priority?: boolean;
  comingSoon?: boolean;
  isActive?: boolean;
}

const art = (key: string) => ({
  desktopImage: `/images/home/${key}-desktop.jpg`,
  mobileImage: `/images/home/${key}-mobile.jpg`,
});

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionSeed[] = [
  {
    key: 'hero',
    title: 'The YDURYA Collection',
    subtitle: 'Comfort. Confidence. Classy.',
    ctaLabel: '+ SHOP NOW',
    href: '/shop',
    ...art('hero'),
    imageAlt: 'YDURYA campaign photograph — the current collection',
    focalDesktop: '50% 40%',
    focalMobile: '50% 30%',
    textAlign: 'BOTTOM_LEFT',
    overlayStrength: 40,
    // The only band above the fold, so the only one loaded eagerly.
    priority: true,
  },
  {
    key: 'fresh-arrivals',
    title: 'Fresh Arrivals',
    subtitle: 'Discover the latest collection',
    ctaLabel: '+ SHOP NOW',
    href: '/shop?collection=fresh-arrivals',
    ...art('fresh-arrivals'),
    imageAlt: 'New season YDURYA styles',
    focalMobile: '50% 35%',
    textAlign: 'BOTTOM_LEFT',
    // A rail here lets people buy without leaving the campaign flow.
    showProductRail: true,
    railSource: 'new',
  },
  {
    key: 'shirts',
    title: 'Shirts',
    subtitle: 'Everyday tailoring, relaxed',
    ctaLabel: '+ SHOP NOW',
    href: '/category/shirts',
    ...art('shirts'),
    imageAlt: 'YDURYA shirts',
    textAlign: 'CENTER',
  },
  {
    key: 'polos',
    title: 'Polos',
    ctaLabel: '+ SHOP NOW',
    href: '/category/polos',
    ...art('polos'),
    imageAlt: 'YDURYA polo shirts',
    textAlign: 'BOTTOM_CENTER',
    // Enabled by the admin once the category has stock.
    isActive: false,
  },
  {
    key: 't-shirts',
    title: 'T-Shirts',
    ctaLabel: '+ SHOP NOW',
    href: '/category/t-shirts',
    ...art('t-shirts'),
    imageAlt: 'YDURYA t-shirts',
    textAlign: 'BOTTOM_LEFT',
    isActive: false,
  },
  {
    key: 'bottoms',
    title: 'Bottoms',
    ctaLabel: '+ SHOP NOW',
    href: '/category/bottoms',
    ...art('bottoms'),
    imageAlt: 'YDURYA trousers and bottoms',
    textAlign: 'BOTTOM_RIGHT',
    isActive: false,
  },
  {
    key: 'kurtas',
    title: 'Kurtas',
    ctaLabel: '+ SHOP NOW',
    href: '/category/kurtas',
    ...art('kurtas'),
    imageAlt: 'YDURYA kurtas',
    textAlign: 'CENTER',
    isActive: false,
  },
  {
    key: 'best-sellers',
    title: 'Best Sellers',
    subtitle: 'Be Royal. Be Loyal.',
    ctaLabel: '+ SHOP NOW',
    href: '/shop?collection=best-sellers',
    ...art('best-sellers'),
    imageAlt: 'YDURYA best selling styles',
    textAlign: 'BOTTOM_CENTER',
    showProductRail: true,
    railSource: 'bestseller',
  },
  {
    key: 'sale',
    title: 'Sale',
    subtitle: 'Season favourites, reduced',
    ctaLabel: '+ SHOP NOW',
    href: '/shop?collection=sale',
    ...art('sale'),
    imageAlt: 'YDURYA sale',
    textAlign: 'BOTTOM_LEFT',
    overlayStrength: 45,
  },
];

/** Categories the editorial homepage links to that the catalogue may not have yet. */
export const HOMEPAGE_CATEGORY_SLUGS = ['shirts', 'polos', 't-shirts', 'bottoms', 'kurtas'] as const;
