import type { Metadata, Viewport } from 'next';
import { Cinzel, Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { BRAND, BRAND_COLORS } from '@/lib/brand';
import { publicEnv } from '@/lib/env';
import { MetaPixel } from '@/components/analytics/meta-pixel';
import { Providers } from './providers';
import './globals.css';

/**
 * The three faces the live ydurya.com theme loads. Self-hosted by next/font,
 * so there is no render-blocking request to Google and no layout shift.
 */
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    // Matches the live store's title, without the duplicated brand suffix.
    default: `${BRAND.name} — Student Wear | ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.legalName }],
  keywords: ['men\'s fashion', 'student wear', 'shirts', 'India', 'YDURYA', 'college wear'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: siteUrl,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-to-zoom disabled for the app-like feel most storefronts on phones
  // go for. Product photography already has its own zoom on the PDP gallery.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: BRAND_COLORS.background,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${cinzel.variable} ${cormorant.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <MetaPixel />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
