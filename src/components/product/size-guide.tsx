'use client';

import * as React from 'react';
import { Ruler } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/**
 * Size guide.
 *
 * The live store publishes S/M/L/XL but no measurement chart, so no
 * measurements are invented here. The panel explains the fit language the
 * product descriptions actually use, and the chart becomes available once
 * measurements are entered in the admin.
 */
export function SizeGuide({ fit }: { fit?: string | null }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide2 text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          <Ruler className="h-3.5 w-3.5" aria-hidden />
          Size guide
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" title="Size guide" className="lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:max-w-md lg:rounded-none">
        <div className="space-y-6 pb-4">
          <div>
            <h3 className="mb-2 font-serif text-base">Available sizes</h3>
            <div className="flex gap-2">
              {['S', 'M', 'L', 'XL'].map((s) => (
                <span key={s} className="grid h-11 w-11 place-items-center rounded-md border border-ink/15 text-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {fit && (
            <div>
              <h3 className="mb-1.5 font-serif text-base">This style</h3>
              <p className="text-sm text-muted">
                Cut as a <strong className="text-ink">{fit.toLowerCase()}</strong>.
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-2 font-serif text-base">How our fits run</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-ink">Regular fit</dt>
                <dd className="text-muted">Classic straight cut — true to size.</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Boxy fit</dt>
                <dd className="text-muted">Relaxed through the body with a shorter, squarer length.</dd>
              </div>
            </dl>
          </div>

          <p className="rounded-md bg-surface p-3 text-xs text-muted">
            Detailed measurements are not published for this style yet. If you are between sizes,
            size up for a boxy fit or stay true to size for a regular fit.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
