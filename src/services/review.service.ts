import 'server-only';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { conflict } from '@/lib/errors';

export const ReviewService = {
  async listForProduct(productId: string, limit = 20) {
    return prisma.review.findMany({
      where: { productId, isApproved: true, deletedAt: null },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true, authorName: true, rating: true, title: true,
        body: true, isVerified: true, createdAt: true,
      },
    });
  },

  async summary(productId: string) {
    const rows = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true, deletedAt: null },
      _count: { rating: true },
    });
    const count = rows.reduce((a, r) => a + r._count.rating, 0);
    if (!count) return null;
    const total = rows.reduce((a, r) => a + r.rating * r._count.rating, 0);
    return {
      average: Math.round((total / count) * 10) / 10,
      count,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: rows.find((r) => r.rating === star)?._count.rating ?? 0,
      })),
    };
  },

  /**
   * Creates a review. `isVerified` is derived from a real delivered order, not
   * from anything the client claims. Reviews start unapproved — the admin
   * publishes them, so no review content is ever fabricated or auto-shown.
   */
  async create(input: {
    productId: string;
    userId: string;
    authorName: string;
    rating: number;
    title?: string;
    body?: string;
  }) {
    const existing = await prisma.review.findFirst({
      where: { productId: input.productId, userId: input.userId, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw conflict('You have already reviewed this product.');

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: input.productId,
        order: { userId: input.userId, status: OrderStatus.DELIVERED },
      },
      select: { id: true },
    });

    return prisma.review.create({
      data: {
        productId: input.productId,
        userId: input.userId,
        authorName: input.authorName.slice(0, 150),
        rating: Math.min(5, Math.max(1, Math.round(input.rating))),
        title: input.title?.slice(0, 255) || null,
        body: input.body?.slice(0, 4000) || null,
        isVerified: Boolean(purchased),
        isApproved: false,
      },
    });
  },
};
