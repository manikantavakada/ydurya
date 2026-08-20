import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * "Our belief" / "Why Ydurya" section.
 *
 * Every line here is copy the live site already publishes about itself — no
 * invented claims, testimonials or statistics have been added.
 */
const PILLARS = [
  {
    icon: '🎓',
    title: 'Built for students',
    body: 'Every piece is designed with student life in mind — affordable, versatile, and built for your best years.',
  },
  {
    icon: '📚',
    title: 'Style education, not just clothes',
    body: 'We teach you how to dress — not just sell you shirts. Follow us on Instagram for weekly style tips.',
  },
  {
    icon: '🏷️',
    title: 'Premium feel, student price',
    body: 'A confident, composed, classy look that earns respect — without needing a stylist or a big budget.',
  },
] as const;

export function BrandStory() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="brand-story-title">
      <div className="container py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Our belief</p>
          <h2 id="brand-story-title" className="font-serif text-3xl italic md:text-4xl">
            {BRAND.intent}
          </h2>
          <p className="mt-4 text-base text-muted text-pretty">{BRAND.description}</p>
          <p className="mt-5 text-2xs uppercase tracking-luxe text-faint">
            Est. {BRAND.established} · {BRAND.city} · {BRAND.country}
          </p>
        </div>

        <ul className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {PILLARS.map((pillar) => (
            <li key={pillar.title} className="text-center md:text-left">
              <span className="text-2xl" aria-hidden>{pillar.icon}</span>
              <h3 className="mt-3 font-serif text-lg">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">{pillar.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="inline-flex h-12 items-center rounded-md bg-ink px-8 text-xs font-medium uppercase tracking-luxe text-bg transition-colors hover:bg-ink/90"
          >
            Shop the collection
          </Link>
        </div>
      </div>
    </section>
  );
}
