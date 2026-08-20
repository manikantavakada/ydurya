# YDURYA — Brand & Data Extraction Brief

Everything below was extracted from the live store at https://ydurya.com (Shopify).
Nothing here is invented. Sources are noted per item.

## Identity
- Name: **YDURYA**
- Title tag: `Ydurya — fashion|stylish|Student Wear | Comfort. Confidence. Classy.`
- Meta description: "Ydurya is India's premium student wear brand. Classy, comfortable, and affordable menswear starting at ₹599."
- Taglines in use: `Comfort. Confidence. Classy.` · `Classy. Confident. Made for Students.` · `Be Royal. Be Loyal.` · `Dress with intention`
- Origin block: `Est. 2025` · `Visakhapatnam` · `India`
- Marquee words: Comfort · Confidence · Classy · Dress with intention · Be Royal · Be Loyal
- Copyright: `© 2026 Ydurya. All rights reserved.`

## Colour palette
Taken verbatim from the theme stylesheet `assets/ydurya.css`. The theme's variable
names are legacy (a dark theme was recoloured to light), so semantic names are used here.

| Semantic role      | Value                | Theme var |
|--------------------|----------------------|-----------|
| Page background    | `#faf9f7` (warm off-white) | `--dark`  |
| Surface / raised   | `#f4f1ec`            | `--dark2` |
| Surface sunken     | `#ede9e2`            | `--dark3` |
| Ink / foreground   | `#1a1a1a`            | `--cream` |
| Accent (gold)      | `#8b6f47`            | `--gold`  |
| Border             | `rgba(26,26,26,.10)` | `--border` |
| Border soft        | `rgba(26,26,26,.06)` | `--border-soft` |
| Muted text         | `rgba(26,26,26,.50)` | `--muted` |
| Very muted         | `rgba(26,26,26,.28)` | `--very-muted` |
| Success (free ship)| `#2a7a4b`            | inline    |

## Typography
Loaded from Google Fonts by the live theme:
- **Cinzel** (400/600/700) — logo + display
- **Cormorant Garamond** (400/500/600, italics) — editorial headings
- **DM Sans** (400/500/600/700) — UI and body

## Navigation (live header)
College Wear · Collection · Categories · New Launch · Best Sellers · Accessories · Contact

## Collections (from /collections.json)
accessories, best-sellers, casual-wear, exam-wear, frontpage, interview-wear,
new-arrivals, new-launch, parties-fests, shakets, shirts, sports-wear,
t-shirts, weekend-stylish

## Homepage sections (live)
1. Marquee announcement — "New Collection 2025 · Visakhapatnam, India · Classy. Confident. Made for Students."
2. Hero — "New Collection / FLAT 70% OFF / Explore Collection"
3. Split banners — "Walk into every room winning. / Shop College Wear" and "Be Royal. Be Loyal. / View Best Sellers"
4. Word marquee
5. New Arrivals grid ("View all new →")
6. Shop by Category (SHAKETS, SHIRTS, T-SHIRTS)
7. The Ydurya Look (video rail — placeholders on the live site)
8. Our belief (Est. 2025 · Visakhapatnam · India)
9. Why Ydurya — three pillars (copy captured verbatim in the seed/import data)
10. Stats — 500+ students wearing Ydurya · 100% made for campus life · ₹599 starting price
11. Footer — Get to Know Us / Policies / Follow Us / Get In Touch

## Commerce rules (extracted from live theme JS — these are real, not assumed)
- `SHIP_FEE = 9900` paise → **₹99 flat shipping**
- `YD_FREE_SHIP_THRESHOLD = 99900` paise → **free shipping over ₹999**
- `YD_FREE_SHIP_ENABLED = true`
- Handling fee: **₹7 per item** ("Handling ₹7 × items")
- COD surcharge: **+₹27** ("Prepaid: no extra | COD: +₹27")
- Currency: INR (₹), locale en-IN
- Checkout provider: **Fastrr by Shiprocket** (`fastrr-boost-ui.pickrr.com/assets/styles/sr-checkout.css`)

## Catalogue (8 live products, from /products.json)
All are shirts, sizes S/M/L/XL, single Size option (no colour option is configured
on the live store — colour is expressed in the product name).

| Title | Live handle | Price | Compare-at |
|---|---|---|---|
| Ydurya Black Button Monarch – Boxy Fit Shirt | beige-shaket | 999 | 2999 |
| Ydurya Cocoa Heritage Check –Regular Fit Shirt | brown-checks-shirt | 659 | 1999 |
| Light Black Line stripe Shirt | best-sellers | 659 | 2100 |
| Grey Denim Shirt | new-arrivals | 999 | 1500 |
| Checks Shirt | checks-shirt | 659 | 1299 |
| Brown Stripes | brown-stripes | 659 | 1200 |
| Blue Stripes Shirt | red-and-black-checks-boxy | 659 | 1200 |
| light blue denim shirt | linen-ice-blue-shaket | 999 | 1500 |

### Data-quality notes carried over from the live store
- Several live handles do not match their product (e.g. the Black Button Monarch
  shirt sits at `/products/beige-shaket`). The importer generates a clean slug from
  the title and stores the original handle in `legacyHandle` so old URLs can 301.
- Vendor is inconsistent on the live store: `YDURYA` on some products,
  `My Store 3` (a Shopify default) on others. The importer normalises to `YDURYA`.
- No SKUs on most products; the two that have them collide (`22` used twice).
  The importer generates deterministic SKUs and flags collisions.
- Only one product has a real description; the rest are empty. The importer marks
  these `needsDescription` for the admin to fill in.

### Image note — requires a decision
The live product images are files named `ChatGPTImage<date>.png` / `ChatGPT_Image_<date>.png`,
i.e. **the store's existing product photography is already AI-generated**. The brief says to
use the real YDURYA imagery but not to use AI-generated product imagery — on this store those
are the same files. Resolution taken: the importer downloads the live images as-is (they are
the brand's actual current assets) and flags every one as `aiGenerated: true` in the admin so
they can be swapped for real photography. No new imagery is generated by this project.
