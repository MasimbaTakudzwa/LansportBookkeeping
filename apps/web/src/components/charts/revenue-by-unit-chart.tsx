"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { EmptyChart } from "./empty-chart";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  unit: string;
  revenue: number;
  pct: number;
}

// Filter to units with revenue, keep top N for display
const MAX_BARS = 17;

export function RevenueByUnitChart({ data }: { data: DataPoint[] }) {
  const filtered = data.filter((d) => d.revenue > 0).slice(0, MAX_BARS);

  if (filtered.length === 0) {
    return <EmptyChart message="No unit revenue data available." />;
  }

  // Height scales with number of bars (min 200, ~28px per bar)
  const chartHeight = Math.max(200, filtered.length * 32);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tickFormatter={(v) => `R${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="unit"
          tick={{ fontSize: 11 }}
          width={110}
        />
        <Tooltip
          formatter={(v: number, _: string, { payload }: { payload: DataPoint }) => [
            `${formatCurrency(v)} (${payload.pct}%)`,
            "Revenue",
          ]}
        />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} maxBarSize={22}>
          {filtered.map((entry, i) => {
            // Gradient: top unit bright green, lower units fade
            const intensity = Math.max(0.35, 1 - i * 0.04);
            return (
              <Cell
                key={entry.unit}
                fill={`rgba(22, 163, 74, ${intensity})`}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
