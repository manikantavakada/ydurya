import { NextResponse, type NextRequest } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { imageStoreConfig } from '@/lib/image-store';

export const dynamic = 'force-dynamic';

/**
 * Serves uploaded product/banner images from `UPLOAD_DIR`.
 *
 * Next's `output: 'standalone'` copies a fresh `public/` on every build, and
 * on Hostinger each deploy swaps in an entirely new build directory — so
 * anything written to `public/uploads` at runtime is gone on the next
 * release. Pointing `UPLOAD_DIR` at a location outside the build tree and
 * serving it through this route (rather than relying on `public/`'s static
 * passthrough) keeps uploads alive across every future deploy without a
 * symlink that would need recreating each time.
 *
 * Every file this pipeline writes is re-encoded WebP by `storeImageBuffer`,
 * so `.webp` is the only extension ever served here.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const cfg = imageStoreConfig();

  const relative = segments.join('/');
  const resolved = path.resolve(cfg.uploadDir, relative);

  // Refuse anything that traverses outside the upload root, and anything
  // that isn't a file this pipeline could have written.
  if (!resolved.startsWith(cfg.uploadDir + path.sep) || !resolved.endsWith('.webp')) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) throw new Error('not a file');

    const body = await readFile(resolved);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(stats.size),
        // Filenames are content-addressed (random suffix per upload), so a
        // given URL never changes contents — safe to cache forever.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
