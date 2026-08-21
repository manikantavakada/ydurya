import type { Metadata } from 'next';
import { EditorialSection } from '@/components/home/editorial-section';
import { SectionProductRail } from '@/components/home/section-product-rail';
import { BrandStory } from '@/components/store/brand-story';
import { WebsiteJsonLd } from '@/components/seo/json-ld';
import { HomepageService } from '@/services/homepage.service';
import { ProductService } from '@/services/product.service';
import { BRAND } from '@/lib/brand';
import type { ProductCardDTO } from '@/types';

/**
 * The homepage is an editorial campaign first and a storefront second: a
 * sequence of full-bleed category bands, with product rails appearing only
 * where an editor has asked for one.
 *
 * Everything is server-rendered — bands, headings and links are in the initial
 * HTML, so the page is crawlable and navigation never waits on JavaScript.
 * Composition comes entirely from the database, editable in Admin → Homepage.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${BRAND.name} — Student Wear | ${BRAND.tagline}`,
  description: BRAND.description,
  alternates: { canonical: '/' },
};

/** Resolves a band's `railSource` to real products. */
async function railProducts(source: string): Promise<{ products: ProductCardDTO[]; href: string }> {
  switch (source) {
    case 'new':
      return { products: await ProductService.byFlag('new', 10), href: '/shop?collection=fresh-arrivals' };
    case 'bestseller':
      return { products: await ProductService.byFlag('bestseller', 10), href: '/shop?collection=best-sellers' };
    case 'sale':
      return { products: await ProductService.byFlag('sale', 10), href: '/shop?collection=sale' };
    case 'featured':
      return { products: await ProductService.byFlag('featured', 10), href: '/shop' };
    default: {
      // Anything else is treated as a category slug.
      const listing = await ProductService.list({ categorySlugs: [source], perPage: 10 });
      return { products: listing.products, href: `/category/${source}` };
    }
  }
}

export default async function HomePage() {
  const sections = await HomepageService.getSections();

  // Resolve every rail up front so the page renders in one pass.
  const rails = new Map<string, { products: ProductCardDTO[]; href: string }>();
  await Promise.all(
    sections
      .filter((s) => s.showProductRail && s.railSource)
      .map(async (s) => rails.set(s.key, await railProducts(s.railSource!))),
  );

  return (
    <>
      {/* The bands carry the page's heading structure; this keeps a single h1. */}
      <h1 className="sr-only">
        {BRAND.name} — {BRAND.description}
      </h1>

      {sections.map((section, index) => {
        const rail = rails.get(section.key);

        return (
          <div key={section.id}>
            <EditorialSection section={section} index={index} />

            {rail && rail.products.length > 0 && (
              <SectionProductRail title={section.title} products={rail.products} href={rail.href} />
            )}
          </div>
        );
      })}

      <BrandStory />
      <WebsiteJsonLd />
    </>
  );
}
