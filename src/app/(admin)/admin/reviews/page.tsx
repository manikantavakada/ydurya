import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ReviewModeration } from '@/components/admin/review-moderation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reviews' };

export default async function AdminReviewsPage() {
  await requirePermission('reviews.read');

  const reviews = await prisma.review.findMany({
    where: { deletedAt: null },
    orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true, authorName: true, rating: true, title: true, body: true,
      isVerified: true, isApproved: true, createdAt: true,
      product: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl">Reviews</h1>
        <p className="mt-1 text-sm text-muted">
          Reviews stay hidden until approved. Nothing is auto-published, and no review content is generated.
        </p>
      </header>

      <ReviewModeration
        reviews={reviews.map((r) => ({
          id: r.id,
          authorName: r.authorName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          isVerified: r.isVerified,
          isApproved: r.isApproved,
          createdAt: r.createdAt.toISOString(),
          productId: r.product.id,
          productName: r.product.name,
        }))}
      />
    </div>
  );
}
