import 'server-only';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toPaise } from '@/lib/money';

/** Orders that represent real revenue — cancelled ones never count. */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED,
];

export const DashboardService = {
  async overview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      revenueAll, revenueMonth, revenuePrevMonth, revenueToday,
      orderCount, pendingOrders, todayOrders,
      customerCount, productCount, lowStockCount, pendingReviews,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { grandTotal: true }, _count: true }),
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES }, placedAt: { gte: startOfMonth } }, _sum: { grandTotal: true }, _count: true }),
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES }, placedAt: { gte: startOfPrevMonth, lt: startOfMonth } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES }, placedAt: { gte: startOfToday } }, _sum: { grandTotal: true }, _count: true }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
      prisma.order.count({ where: { placedAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*) AS c FROM Inventory
        WHERE allowBackorder = 0 AND (quantity - reserved) <= lowStockThreshold
      `,
      prisma.review.count({ where: { isApproved: false, deletedAt: null } }),
    ]);

    const monthRevenue = revenueMonth._sum.grandTotal ? toPaise(revenueMonth._sum.grandTotal) : 0;
    const prevRevenue = revenuePrevMonth._sum.grandTotal ? toPaise(revenuePrevMonth._sum.grandTotal) : 0;

    return {
      revenue: {
        allTimePaise: revenueAll._sum.grandTotal ? toPaise(revenueAll._sum.grandTotal) : 0,
        monthPaise: monthRevenue,
        todayPaise: revenueToday._sum.grandTotal ? toPaise(revenueToday._sum.grandTotal) : 0,
        // Null rather than a fabricated 100% when there is no prior month to compare.
        monthChangePercent: prevRevenue > 0 ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null,
      },
      orders: {
        total: orderCount,
        paid: revenueAll._count,
        month: revenueMonth._count,
        today: revenueToday._count,
        pending: pendingOrders,
        todayPlaced: todayOrders,
      },
      customers: customerCount,
      products: productCount,
      lowStock: Number(lowStockCount[0]?.c ?? 0),
      pendingReviews,
    };
  },

  /** Daily revenue for the sales chart. Days with no orders are filled with zero. */
  async salesSeries(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<{ day: Date; total: Prisma.Decimal; orders: bigint }[]>`
      SELECT DATE(placedAt) AS day, SUM(grandTotal) AS total, COUNT(*) AS orders
        FROM \`Order\`
       WHERE placedAt >= ${since}
         AND status IN ('CONFIRMED','PROCESSING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED')
       GROUP BY DATE(placedAt)
       ORDER BY day ASC
    `;

    const byDay = new Map(
      rows.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        { revenuePaise: toPaise(r.total), orders: Number(r.orders) },
      ]),
    );

    return Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, ...(byDay.get(key) ?? { revenuePaise: 0, orders: 0 }) };
    });
  },

  async recentOrders(limit = 8) {
    return prisma.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: limit,
      select: {
        id: true, orderNumber: true, status: true, grandTotal: true,
        paymentMethod: true, placedAt: true, email: true,
        addressSnapshot: true,
        _count: { select: { items: true } },
      },
    });
  },

  /** Best-selling products by units, over live revenue orders only. */
  async topProducts(limit = 5) {
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: REVENUE_STATUSES } }, productId: { not: null } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const ids = grouped.map((g) => g.productId).filter((id): id is string => Boolean(id));
    if (!ids.length) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, slug: true,
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, isPlaceholder: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return grouped.flatMap((g) => {
      const p = g.productId ? byId.get(g.productId) : undefined;
      if (!p) return [];
      const img = p.images[0];
      return [{
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: img && !img.isPlaceholder ? img.url : null,
        unitsSold: g._sum.quantity ?? 0,
        revenuePaise: g._sum.lineTotal ? toPaise(g._sum.lineTotal) : 0,
      }];
    });
  },

  /** Products the admin still needs to finish after the catalogue import. */
  async needsAttention(limit = 10) {
    return prisma.product.findMany({
      where: { deletedAt: null, OR: [{ needsImagery: true }, { needsDescription: true }] },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, name: true, slug: true, status: true, needsImagery: true, needsDescription: true },
    });
  },

  async unsettledPayments(limit = 10) {
    return prisma.payment.findMany({
      where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] }, method: 'PREPAID' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, amount: true, status: true, createdAt: true,
        order: { select: { id: true, orderNumber: true, email: true } },
      },
    });
  },
};
