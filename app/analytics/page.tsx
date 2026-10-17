import { prisma } from "../../lib/prisma";
import Link from "next/link";
import RevenueChart, { type ChartPoint } from "./RevenueChart";
import type { Metadata } from "next";
import { requireAdmin } from "../../lib/auth";

export const metadata: Metadata = { title: "Analytics — The Lady Dress" };

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const kpiTints = {
  amber: { card: "from-amber-100 to-orange-50 border-amber-200", label: "text-amber-600", value: "text-amber-900" },
  violet: { card: "from-violet-100 to-purple-50 border-violet-200", label: "text-violet-600", value: "text-violet-900" },
  sky: { card: "from-sky-100 to-cyan-50 border-sky-200", label: "text-sky-600", value: "text-sky-900" },
  emerald: { card: "from-emerald-100 to-teal-50 border-emerald-200", label: "text-emerald-600", value: "text-emerald-900" },
};

function KpiCard({
  label,
  value,
  sub,
  accent,
  tint = "violet",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tint?: keyof typeof kpiTints;
}) {
  const t = kpiTints[tint];
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent
          ? "bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 border-transparent text-white shadow-fuchsia-200"
          : `bg-gradient-to-br ${t.card}`
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-white/75" : t.label}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold mt-2 ${accent ? "text-white" : t.value}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1 ${accent ? "text-white/75" : `${t.label} opacity-75`}`}>{sub}</p>
      )}
    </div>
  );
}

type Channel = "SHOP" | "ONLINE";

function ChannelCard({
  label,
  today,
  week,
  month,
  tone,
}: {
  label: string;
  today: { revenue: number; count: number };
  week: { revenue: number; count: number };
  month: { revenue: number; count: number };
  tone: "shop" | "online" | "total";
}) {
  const styles = {
    shop: "bg-gradient-to-br from-violet-100 to-purple-50 border-violet-200",
    online: "bg-gradient-to-br from-sky-100 to-cyan-50 border-sky-200",
    total: "bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-600 border-transparent text-white shadow-fuchsia-200",
  }[tone];
  const dot = { shop: "bg-violet-500", online: "bg-sky-500", total: "bg-white" }[tone];
  const muted = tone === "total" ? "text-white/70" : "text-stone-500";
  const strong = tone === "total" ? "text-white" : "text-stone-900";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}>
      <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${muted}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {label}
      </p>
      <p className={`text-3xl font-bold mt-2 ${strong}`}>{formatPrice(month.revenue)}</p>
      <p className={`text-xs mt-1 ${muted}`}>this month · {month.count} sales</p>
      <div className={`mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-sm ${tone === "total" ? "border-white/20" : "border-white"}`}>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Today</p>
          <p className={`font-semibold ${strong}`}>{formatPrice(today.revenue)}</p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>This week</p>
          <p className={`font-semibold ${strong}`}>{formatPrice(week.revenue)}</p>
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await requireAdmin();
  const { channel: channelParam } = await searchParams;
  const channelFilter: Channel | null =
    channelParam === "shop" ? "SHOP" : channelParam === "online" ? "ONLINE" : null;

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // ── Fetch everything in parallel ──────────────────────
  const [sales30d, allVariants, recentSales] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "asc" },
      select: {
        total: true,
        channel: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            subtotal: true,
            variant: {
              select: {
                product: { select: { id: true, name: true, brand: true } },
              },
            },
          },
        },
      },
    }),

    prisma.variant.findMany({
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        stock: true,
        lowStockAt: true,
        product: { select: { id: true, name: true } },
      },
    }),

    prisma.sale.findMany({
      take: 10,
      where: channelFilter ? { channel: channelFilter } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiptNo: true,
        total: true,
        discount: true,
        paymentMethod: true,
        channel: true,
        cashierName: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
    }),
  ]);

  // ── KPIs ──────────────────────────────────────────────
  const todaySales = sales30d.filter((s) => s.createdAt >= todayStart);
  const weekSales = sales30d.filter((s) => s.createdAt >= weekStart);
  const monthSales = sales30d.filter((s) => s.createdAt >= monthStart);

  const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
  const weekRevenue = weekSales.reduce((s, x) => s + x.total, 0);
  const monthRevenue = monthSales.reduce((s, x) => s + x.total, 0);

  const todayItemsSold = todaySales.reduce(
    (s, x) => s + x.items.reduce((n, i) => n + i.quantity, 0),
    0
  );
  const totalSales30d = sales30d.length;
  const avgSaleValue =
    totalSales30d > 0
      ? sales30d.reduce((s, x) => s + x.total, 0) / totalSales30d
      : 0;

  // ── Shop vs online ────────────────────────────────────
  const summarize = (list: typeof sales30d) => ({
    revenue: list.reduce((s, x) => s + x.total, 0),
    count: list.length,
  });
  const byChannel = (list: typeof sales30d, c: Channel) =>
    summarize(list.filter((s) => s.channel === c));
  const channelStats = (c: Channel | null) => ({
    today: c ? byChannel(todaySales, c) : summarize(todaySales),
    week: c ? byChannel(weekSales, c) : summarize(weekSales),
    month: c ? byChannel(monthSales, c) : summarize(monthSales),
  });

  // ── Chart data — daily revenue last 30 days ───────────
  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const sale of sales30d) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + sale.total);
  }
  const chartData: ChartPoint[] = [...dailyMap.entries()].map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // ── Top products (last 30 days) ───────────────────────
  const productMap = new Map<
    number,
    { name: string; brand: string | null; revenue: number; unitsSold: number }
  >();
  for (const sale of sales30d) {
    for (const item of sale.items) {
      const p = item.variant.product;
      const prev = productMap.get(p.id) ?? {
        name: p.name,
        brand: p.brand,
        revenue: 0,
        unitsSold: 0,
      };
      productMap.set(p.id, {
        ...prev,
        revenue: prev.revenue + item.subtotal,
        unitsSold: prev.unitsSold + item.quantity,
      });
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
  const maxProductRevenue = topProducts[0]?.revenue ?? 1;

  // ── Stock alerts ──────────────────────────────────────
  const lowStock = allVariants
    .filter((v) => v.stock > 0 && v.stock <= v.lowStockAt)
    .sort((a, b) => a.stock - b.stock);
  const outOfStock = allVariants
    .filter((v) => v.stock === 0)
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">

        <h1 className="page-title mb-6">Analytics</h1>

        {/* ── KPI row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <KpiCard
              label="Revenue today"
              value={formatPrice(todayRevenue)}
              sub={`${todaySales.length} sale${todaySales.length !== 1 ? "s" : ""} · ${todayItemsSold} items`}
              accent
            />
          </div>
          <KpiCard
            label="This week"
            tint="amber"
            value={formatPrice(weekRevenue)}
            sub={`${weekSales.length} sales`}
          />
          <KpiCard
            label="This month"
            tint="violet"
            value={formatPrice(monthRevenue)}
            sub={`${monthSales.length} sales`}
          />
          <KpiCard
            label="30-day sales"
            tint="sky"
            value={String(totalSales30d)}
            sub="transactions"
          />
          <KpiCard
            label="Avg sale"
            tint="emerald"
            value={formatPrice(avgSaleValue)}
            sub="last 30 days"
          />
        </div>

        {/* ── Shop vs online ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <ChannelCard label="Shop sales" tone="shop" {...channelStats("SHOP")} />
          <ChannelCard label="Online sales" tone="online" {...channelStats("ONLINE")} />
          <ChannelCard label="Total" tone="total" {...channelStats(null)} />
        </div>

        {/* ── Revenue chart ─────────────────────────────── */}
        <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">
            Revenue — last 30 days
          </h2>
          <RevenueChart data={chartData} />
        </div>

        {/* ── Top products + stock alerts ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Top products */}
          <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-700">
                Top Products
                <span className="ml-2 text-xs font-normal text-stone-400">last 30 days</span>
              </h2>
            </div>
            {topProducts.length === 0 ? (
              <p className="px-6 py-10 text-sm text-stone-400 text-center">
                No sales yet — complete a sale in{" "}
                <Link href="/checkout" className="text-rose-500 hover:underline">
                  Checkout
                </Link>
                .
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 px-6 py-3">
                    <span className="text-xs font-bold text-stone-300 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {p.name}
                      </p>
                      {p.brand && (
                        <p className="text-xs text-stone-400">{p.brand}</p>
                      )}
                      {/* Bar */}
                      <div className="mt-1.5 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-stone-800">
                        {formatPrice(p.revenue)}
                      </p>
                      <p className="text-xs text-stone-400">{p.unitsSold} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock alerts */}
          <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">Stock Alerts</h2>
              <Link
                href="/inventory"
                className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
              >
                Manage →
              </Link>
            </div>

            {lowStock.length === 0 && outOfStock.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-emerald-600 font-medium">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {outOfStock.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-stone-700">
                        {v.product.name}
                      </p>
                      <p className="text-xs font-mono text-stone-400">
                        {v.sku}
                        {(v.size || v.color) && ` · ${[v.size, v.color].filter(Boolean).join(" / ")}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                      Out of stock
                    </span>
                  </div>
                ))}
                {lowStock.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-stone-700">
                        {v.product.name}
                      </p>
                      <p className="text-xs font-mono text-stone-400">
                        {v.sku}
                        {(v.size || v.color) && ` · ${[v.size, v.color].filter(Boolean).join(" / ")}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                      {v.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent sales ──────────────────────────────── */}
        <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Recent Sales</h2>
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">
                {([
                  ["All", null],
                  ["Shop", "shop"],
                  ["Online", "online"],
                ] as const).map(([label, value]) => {
                  const active = (channelFilter?.toLowerCase() ?? null) === value;
                  return (
                    <Link
                      key={label}
                      href={value ? `/analytics?channel=${value}` : "/analytics"}
                      scroll={false}
                      className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                        active ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/checkout"
                className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
              >
                New sale →
              </Link>
            </div>
          </div>

          {recentSales.length === 0 ? (
            <p className="px-6 py-10 text-sm text-stone-400 text-center">
              {channelFilter
                ? `No ${channelFilter === "ONLINE" ? "online" : "shop"} sales yet.`
                : "No sales yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-violet-50">
                    {["Receipt", "Date", "Items", "Sold", "Payment", "Discount", "Total"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentSales.map((sale) => {
                    const itemCount = sale.items.reduce((n, i) => n + i.quantity, 0);
                    return (
                      <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-stone-500">
                          {sale.receiptNo}
                        </td>
                        <td className="px-6 py-3 text-stone-500 whitespace-nowrap text-xs">
                          {sale.createdAt.toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3 text-stone-600">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              sale.channel === "ONLINE"
                                ? "bg-sky-50 text-sky-600"
                                : "bg-violet-50 text-violet-600"
                            }`}
                          >
                            {sale.channel === "ONLINE" ? "Online" : "Shop"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              sale.paymentMethod === "CASH"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-stone-400 text-xs">
                          {sale.discount > 0 ? `− ${formatPrice(sale.discount)}` : "—"}
                        </td>
                        <td className="px-6 py-3 font-semibold text-stone-800">
                          {formatPrice(sale.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
