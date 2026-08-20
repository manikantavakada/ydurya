import Link from 'next/link';
import { Instagram } from 'lucide-react';
import { BRAND, FOOTER_LINKS } from '@/lib/brand';
import { NewsletterForm } from './newsletter-form';

/** Footer mirroring the live site's link groups. No invented claims. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="font-display text-2xl font-bold tracking-luxe text-ink">{BRAND.name}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted text-pretty">{BRAND.description}</p>
            <p className="mt-5 text-2xs uppercase tracking-luxe text-faint">
              Est. {BRAND.established} · {BRAND.city}, {BRAND.country}
            </p>

            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <Instagram className="h-4 w-4" aria-hidden />
              Instagram
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <nav key={group} aria-label={group}>
                <h2 className="eyebrow mb-3.5">{group}</h2>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-3.5">Stay in the loop</h2>
            <p className="mb-4 text-sm text-muted text-pretty">
              New drops and student offers, straight to your inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-faint">© {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.</p>
          <p className="text-xs text-faint">🇮🇳 India (INR ₹) · English</p>
        </div>
      </div>
    </footer>
  );
}
