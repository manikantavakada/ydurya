/**
 * Development seed.
 *
 * This deliberately does NOT create fake YDURYA products. Real catalogue data
 * comes from `npm run import:shopify`, which reads the live store's public
 * JSON. Anything created here that stands in for a product is named
 * "DEV PRODUCT ONLY" so it can never be mistaken for real merchandise.
 *
 * What this script does create for every environment (including production):
 *   • the size and colour reference tables
 *   • the category tree matching the live store's collections
 *   • the commerce settings extracted from the live storefront
 *   • the homepage banner slots, using the live site's real copy
 */
import '../scripts/load-env';
import { PrismaClient, Role, ProductStatus, BannerPlacement } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../src/data/homepage';

const prisma = new PrismaClient();

const SIZES = [
  { code: 'S', label: 'S', position: 1 },
  { code: 'M', label: 'M', position: 2 },
  { code: 'L', label: 'L', position: 3 },
  { code: 'XL', label: 'XL', position: 4 },
  { code: 'XXL', label: 'XXL', position: 5 },
];

/**
 * Colours the live catalogue actually expresses through its product names
 * (the Shopify store has no colour option configured). Hex values are neutral
 * swatch approximations used only for the filter chips.
 */
const COLORS = [
  { slug: 'black', name: 'Black', hex: '#1a1a1a', position: 1 },
  { slug: 'white', name: 'White', hex: '#f5f5f0', position: 2 },
  { slug: 'grey', name: 'Grey', hex: '#8a8a8a', position: 3 },
  { slug: 'brown', name: 'Brown', hex: '#6b4b32', position: 4 },
  { slug: 'beige', name: 'Beige', hex: '#d8cbb6', position: 5 },
  { slug: 'blue', name: 'Blue', hex: '#3f5c86', position: 6 },
  { slug: 'light-blue', name: 'Light Blue', hex: '#a8c0d8', position: 7 },
  { slug: 'olive', name: 'Olive', hex: '#5d6144', position: 8 },
];

/** Mirrors the collections published on ydurya.com. */
const CATEGORIES = [
  { slug: 'shirts', name: 'Shirts', position: 1, showInNav: true },
  { slug: 'polos', name: 'Polos', position: 2, showInNav: true },
  { slug: 't-shirts', name: 'T-Shirts', position: 3, showInNav: true },
  // Linked from the editorial homepage. Created so those routes resolve rather
  // than 404 before the catalogue is extended into them.
  { slug: 'jackets', name: 'Jackets', position: 4, showInNav: true },
  { slug: 'hoodies', name: 'Hoodies', position: 5, showInNav: true },
  { slug: 'bottoms', name: 'Bottoms', position: 6, showInNav: true },
  { slug: 'kurtas', name: 'Kurtas', position: 7, showInNav: true },
  { slug: 'shakets', name: 'Shakets', position: 8, showInNav: true },
  { slug: 'accessories', name: 'Accessories', position: 9, showInNav: true },
  { slug: 'new-arrivals', name: 'New Arrivals', position: 10, showInNav: true },
  { slug: 'new-launch', name: 'New Launch', position: 11, showInNav: true },
  { slug: 'best-sellers', name: 'Best Sellers', position: 12, showInNav: true },
  { slug: 'casual-wear', name: 'Casual Wear', position: 11 },
  { slug: 'weekend-stylish', name: 'Weekend Stylish', position: 12 },
  { slug: 'exam-wear', name: 'Exam Wear', position: 13 },
  { slug: 'interview-wear', name: 'Interview Wear', position: 14 },
  { slug: 'parties-fests', name: 'Parties & Fests', position: 15 },
  { slug: 'sports-wear', name: 'Sports Wear', position: 16 },
];

/** Commerce rules read out of the live storefront's own JavaScript. */
const SETTINGS: { key: string; value: string; type: string; group: string; label: string }[] = [
  { key: 'shipping.fee_paise', value: '9900', type: 'number', group: 'shipping', label: 'Flat shipping fee (paise)' },
  { key: 'shipping.free_threshold_paise', value: '99900', type: 'number', group: 'shipping', label: 'Free shipping above (paise)' },
  { key: 'shipping.free_enabled', value: 'true', type: 'boolean', group: 'shipping', label: 'Free shipping enabled' },
  { key: 'shipping.cod_enabled', value: 'true', type: 'boolean', group: 'shipping', label: 'Cash on delivery enabled' },
  { key: 'shipping.cod_fee_paise', value: '2700', type: 'number', group: 'shipping', label: 'COD surcharge (paise)' },
  { key: 'handling.per_item_paise', value: '700', type: 'number', group: 'handling', label: 'Handling fee per item (paise)' },
  { key: 'tax.enabled', value: 'false', type: 'boolean', group: 'tax', label: 'Charge tax at checkout' },
  { key: 'tax.rate_percent', value: '0', type: 'number', group: 'tax', label: 'Tax rate (%)' },
  { key: 'orders.number_prefix', value: 'YD', type: 'string', group: 'orders', label: 'Order number prefix' },
  { key: 'store.currency', value: 'INR', type: 'string', group: 'store', label: 'Currency' },
  { key: 'store.pickup_pincode', value: '530001', type: 'string', group: 'store', label: 'Pickup PIN code (Visakhapatnam)' },
  { key: 'inventory.low_stock_threshold', value: '3', type: 'number', group: 'inventory', label: 'Default low-stock threshold' },
];

/**
 * Homepage banners. Copy is taken verbatim from the live site; images are left
 * null on purpose so they appear in the admin as clear upload placeholders
 * rather than being invented.
 */
const BANNERS = [
  {
    placement: BannerPlacement.HOME_HERO,
    eyebrow: 'New Collection',
    title: 'FLAT 70% OFF',
    subtitle: 'Classy. Confident. Made for Students.',
    ctaLabel: 'Explore Collection',
    ctaHref: '/shop',
    overlay: 'rgba(26,26,26,0.35)',
    position: 0,
  },
  {
    placement: BannerPlacement.HOME_SPLIT,
    eyebrow: null,
    title: 'Walk into every room winning.',
    subtitle: null,
    ctaLabel: 'Shop College Wear',
    ctaHref: '/category/casual-wear',
    overlay: 'rgba(26,26,26,0.30)',
    position: 0,
  },
  {
    placement: BannerPlacement.HOME_SPLIT,
    eyebrow: null,
    title: 'Be Royal. Be Loyal.',
    subtitle: null,
    ctaLabel: 'View Best Sellers',
    ctaHref: '/category/best-sellers',
    overlay: 'rgba(26,26,26,0.30)',
    position: 1,
  },
];

async function main() {
  console.log('▸ Seeding reference data…');

  for (const size of SIZES) {
    await prisma.size.upsert({ where: { code: size.code }, create: size, update: { label: size.label, position: size.position } });
  }
  for (const color of COLORS) {
    await prisma.color.upsert({ where: { slug: color.slug }, create: color, update: { name: color.name, hex: color.hex, position: color.position } });
  }
  console.log(`  ✓ ${SIZES.length} sizes, ${COLORS.length} colours`);

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c, legacyHandle: c.slug, isActive: true },
      update: { name: c.name, position: c.position, showInNav: c.showInNav ?? false },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  for (const s of SETTINGS) {
    await prisma.setting.upsert({ where: { key: s.key }, create: s, update: { label: s.label } });
  }
  console.log(`  ✓ ${SETTINGS.length} settings (live shipping/COD/handling rules)`);

  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    for (const b of BANNERS) await prisma.banner.create({ data: { ...b, isActive: true } });
    console.log(`  ✓ ${BANNERS.length} banner slots (images pending upload in admin)`);
  } else {
    console.log('  • banners already present, left untouched');
  }

  // ── Homepage editorial bands ────────────────────────────────────────────
  // Upserted by key, so re-running the seed never clobbers an editor's work:
  // existing rows keep their copy, artwork, ordering and on/off state.
  let createdSections = 0;
  for (const [i, section] of DEFAULT_HOMEPAGE_SECTIONS.entries()) {
    const existing = await prisma.homepageSection.findUnique({ where: { key: section.key } });
    if (existing) continue;

    await prisma.homepageSection.create({
      data: {
        key: section.key,
        title: section.title,
        subtitle: section.subtitle ?? null,
        ctaLabel: section.ctaLabel ?? '+ SHOP NOW',
        href: section.href,
        desktopImage: section.desktopImage ?? null,
        mobileImage: section.mobileImage ?? null,
        imageAlt: section.imageAlt ?? null,
        focalDesktop: section.focalDesktop ?? '50% 50%',
        focalMobile: section.focalMobile ?? '50% 35%',
        textMode: section.textMode ?? 'IMAGE',
        textAlign: section.textAlign ?? 'BOTTOM_LEFT',
        theme: section.theme ?? 'LIGHT',
        overlayStrength: section.overlayStrength ?? 35,
        showProductRail: section.showProductRail ?? false,
        railSource: section.railSource ?? null,
        priority: section.priority ?? false,
        isActive: section.isActive ?? true,
        position: i,
      },
    });
    createdSections++;
  }
  console.log(
    createdSections > 0
      ? `  ✓ ${createdSections} homepage sections (artwork pending — drop files in public/images/home/ or upload in Admin → Homepage)`
      : '  • homepage sections already present, left untouched',
  );

  // ── Admin account ───────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ydurya.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    if (!adminPassword && process.env.NODE_ENV === 'production') {
      // Never invent a production admin password.
      console.log('  ! No SEED_ADMIN_PASSWORD set — skipping admin creation. Use `npm run admin:create`.');
    } else {
      const password = adminPassword ?? 'ChangeMe123!';
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await bcrypt.hash(password, 12),
          firstName: 'Ydurya',
          lastName: 'Admin',
          role: Role.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
          wishlist: { create: {} },
        },
      });
      console.log(`  ✓ SUPER_ADMIN ${adminEmail}${adminPassword ? '' : ' (password: ChangeMe123! — change this immediately)'}`);
    }
  } else {
    console.log(`  • admin ${adminEmail} already exists`);
  }

  // ── Development placeholder product ─────────────────────────────────────
  // Only outside production, and unmistakably labelled.
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEV_PRODUCT !== 'false') {
    const shirts = await prisma.category.findUnique({ where: { slug: 'shirts' } });
    const existing = await prisma.product.findUnique({ where: { slug: 'dev-product-only-sample-shirt' } });

    if (!existing && shirts) {
      const sizes = await prisma.size.findMany({ where: { code: { in: ['S', 'M', 'L', 'XL'] } } });
      const black = await prisma.color.findUnique({ where: { slug: 'black' } });

      await prisma.product.create({
        data: {
          slug: 'dev-product-only-sample-shirt',
          name: 'DEV PRODUCT ONLY — Sample Shirt',
          subtitle: 'Not a real YDURYA product',
          description:
            '<p><strong>DEV PRODUCT ONLY.</strong> This placeholder exists so local development has a buyable product. It is not a YDURYA product and must never appear in production. Import the real catalogue with <code>npm run import:shopify</code>.</p>',
          status: ProductStatus.ACTIVE,
          publishedAt: new Date(),
          price: 659,
          compareAtPrice: 1299,
          vendor: 'YDURYA',
          fabric: 'Cotton Blend',
          fit: 'Regular',
          needsImagery: true,
          isNewArrival: true,
          categories: { create: { categoryId: shirts.id } },
          images: {
            create: {
              url: '',
              alt: 'DEV PRODUCT ONLY placeholder — upload an image in the admin panel',
              position: 0,
              isPlaceholder: true,
            },
          },
          variants: {
            create: sizes.map((s, i) => ({
              sku: `DEV-SAMPLE-${s.code}`,
              sizeId: s.id,
              colorId: black?.id ?? null,
              price: 659,
              compareAtPrice: 1299,
              position: i,
              inventory: { create: { quantity: 10, lowStockThreshold: 3 } },
            })),
          },
        },
      });
      console.log('  ✓ 1 DEV PRODUCT ONLY placeholder (dev environment only)');
    }
  }

  console.log('\n✅ Seed complete.\n   Next: npm run import:shopify — pulls the real YDURYA catalogue.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
