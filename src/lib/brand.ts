/**
 * Brand constants lifted verbatim from the live ydurya.com theme.
 * Nothing here is invented copy — see docs/BRAND.md for the source of each item.
 */
export const BRAND = {
  name: 'YDURYA',
  legalName: 'Ydurya',
  tagline: 'Comfort. Confidence. Classy.',
  subTagline: 'Classy. Confident. Made for Students.',
  motto: 'Be Royal. Be Loyal.',
  intent: 'Dress with intention',
  description:
    "Ydurya is India's premium student wear brand. Classy, comfortable, and affordable menswear starting at ₹599.",
  established: '2025',
  city: 'Visakhapatnam',
  country: 'India',
  instagram: 'https://www.instagram.com/ydurya_?igsi=d2FldGg5bWVoaHIy',
  email: 'lankaravanaaa1234@gmail.com',
  /** Digits only, no leading +, for wa.me links. */
  whatsappNumber: '916309636534',
  phoneDisplay: '+91 63096 36534',
  /** Marquee words shown between the header and the hero on the live site. */
  marquee: ['Comfort', 'Confidence', 'Classy', 'Dress with intention', 'Be Royal · Be Loyal'],
  announcements: [
    'New Collection 2025',
    'Visakhapatnam, India',
    'Classy. Confident. Made for Students.',
  ],
} as const;

/** The live store's colour tokens. Mirrors the CSS custom properties in globals.css. */
export const BRAND_COLORS = {
  background: '#faf9f7',
  surface: '#f4f1ec',
  surfaceSunken: '#ede9e2',
  ink: '#1a1a1a',
  gold: '#8b6f47',
  success: '#2a7a4b',
} as const;

/** Footer link groups, matching the live site's information architecture. */
export const FOOTER_LINKS = {
  'Get to Know Us': [
    { label: 'About Us', href: '/pages/about-us' },
    { label: 'Contact Us', href: '/pages/contact' },
  ],
  Policies: [
    { label: 'Terms and Conditions', href: '/pages/terms-and-conditions' },
    { label: 'Privacy Policy', href: '/pages/privacy-policy' },
    { label: 'Return & Exchange Policy', href: '/pages/return-exchange-policy' },
    { label: 'Shipping and Delivery Policy', href: '/pages/shipping-and-delivery-policy' },
  ],
  Orders: [
    { label: 'Track Order', href: '/track-order' },
    { label: 'Exchange / Return Request', href: '/account/orders' },
    { label: 'Wishlist', href: '/wishlist' },
  ],
} as const;
