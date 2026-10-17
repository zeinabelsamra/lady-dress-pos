'use client'

import { useState } from "react";

export type ChartPoint = { date: string; revenue: number };

function fmt(n: number) {
  if (n === 0) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const W = 700;
  const H = 200;
  const pl = 52; // padding left
  const pr = 16; // padding right
  const pt = 12; // padding top
  const pb = 36; // padding bottom
  const cw = W - pl - pr;
  const ch = H - pt - pb;
  const bw = cw / data.length;
  const gap = 3;

  const yTicks = [0, 0.5, 1].map((r) => Math.round(r * maxRevenue));

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 200 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((v) => {
          const y = pt + ch - (v / maxRevenue) * ch;
          return (
            <g key={v}>
              <line
                x1={pl} y1={y} x2={W - pr} y2={y}
                stroke="#e7e5e4" strokeWidth={1}
              />
              <text
                x={pl - 6} y={y + 4}
                textAnchor="end" fontSize={10} fill="#a8a29e"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max((d.revenue / maxRevenue) * ch, d.revenue > 0 ? 3 : 0);
          const x = pl + i * bw + gap / 2;
          const y = pt + ch - barH;
          const w = bw - gap;
          const isHovered = hovered === i;

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHovered(i)}
              style={{ cursor: "default" }}
            >
              {/* Invisible hit area */}
              <rect x={x} y={pt} width={w} height={ch} fill="transparent" />
              {/* Bar */}
              <rect
                x={x} y={y} width={w} height={barH}
                rx={2}
                fill={isHovered ? "#be123c" : "#e11d48"}
                opacity={isHovered ? 1 : 0.75}
              />
            </g>
          );
        })}

        {/* X-axis labels — every 5 days */}
        {data.map((d, i) => {
          if (i % 5 !== 0 && i !== data.length - 1) return null;
          const x = pl + i * bw + bw / 2;
          const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          });
          return (
            <text
              key={d.date}
              x={x} y={H - 8}
              textAnchor="middle" fontSize={9} fill="#a8a29e"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute z-10 pointer-events-none bg-stone-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl"
          style={{
            left: `${((hovered + 0.5) / data.length) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-semibold whitespace-nowrap">
            {new Date(data[hovered].date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          <p className="text-stone-300 mt-0.5">{formatPrice(data[hovered].revenue)}</p>
        </div>
      )}
    </div>
  );
}
