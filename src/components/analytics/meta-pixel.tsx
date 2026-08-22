'use client';

import * as React from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { publicEnv } from '@/lib/env';

/**
 * Meta Pixel base script — loads the SDK and fires the initial PageView.
 *
 * Separate from `src/lib/analytics/providers.ts`, which only fires
 * *commerce* events (ViewContent, AddToCart, Purchase, …) through `fbq` once
 * this has made it available on `window`. This component's only job is
 * getting `fbq` there in the first place and keeping PageView accurate.
 *
 * Inert with no NEXT_PUBLIC_META_PIXEL_ID set, same as every other
 * analytics provider in this app — nothing loads, nothing is sent.
 */
export function MetaPixel() {
  const pixelId = publicEnv.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  // The base script below fires the first PageView itself; this only
  // covers subsequent client-side navigations, which a single-page app
  // never reloads for.
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (!pixelId) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq?.('track', 'PageView');
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
