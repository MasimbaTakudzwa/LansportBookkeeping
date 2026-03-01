"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyChart } from "./empty-chart";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  period: string;
  revenue: number;
  change: number | null;
}

const tickFormatter = (v: number) =>
  `R${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload[0].value;
  // Find change from the data array via label
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-green-600">Revenue: {formatCurrency(revenue)}</p>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart message="No revenue trend data available." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} width={56} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#revGradient)"
          dot={{ r: 5, fill: "#16a34a" }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
