'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatDate, cn } from '@/lib/utils';

export interface AdminReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  productId: string;
  productName: string;
}

export function ReviewModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const act = async (id: string, action: 'approve' | 'unapprove' | 'delete') => {
    setBusyId(id);
    try {
      const res =
        action === 'delete'
          ? await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
          : await fetch(`/api/admin/reviews/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isApproved: action === 'approve' }),
            });
      if (!res.ok) throw new Error();

      toast({
        title:
          action === 'delete' ? 'Review removed' : action === 'approve' ? 'Review published' : 'Review hidden',
        variant: 'success',
      });
      router.refresh();
    } catch {
      toast({ title: 'Could not update that review.', variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-line p-10 text-center text-sm text-muted">
        No reviews have been submitted yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className={cn('rounded-lg border p-5', review.isApproved ? 'border-line' : 'border-gold/30 bg-gold/[0.03]')}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex gap-0.5" role="img" aria-label={`${review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn('h-3.5 w-3.5', i <= review.rating ? 'fill-gold-ink text-gold-ink' : 'text-ink/20')}
                      aria-hidden
                    />
                  ))}
                </span>
                <span className="text-sm font-medium text-ink">{review.authorName}</span>
                {review.isVerified && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-2xs uppercase tracking-wide2 text-success">
                    Verified buyer
                  </span>
                )}
                {!review.isApproved && (
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-2xs uppercase tracking-wide2 text-gold-ink">
                    Pending
                  </span>
                )}
              </div>

              <Link
                href={`/admin/products/${review.productId}`}
                className="mt-1 block text-xs text-muted hover:text-ink hover:underline"
              >
                {review.productName}
              </Link>

              {review.title && <p className="mt-2 text-sm font-medium text-ink">{review.title}</p>}
              {review.body && <p className="mt-1 text-sm leading-relaxed text-muted">{review.body}</p>}
              <p className="mt-2 text-2xs text-faint">{formatDate(review.createdAt, 'long')}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant={review.isApproved ? 'outline' : 'primary'}
                loading={busyId === review.id}
                onClick={() => act(review.id, review.isApproved ? 'unapprove' : 'approve')}
              >
                {review.isApproved ? 'Hide' : 'Publish'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted hover:text-danger"
                onClick={() => act(review.id, 'delete')}
                aria-label="Delete review"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
