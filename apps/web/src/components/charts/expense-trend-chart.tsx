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
  expenses: number;
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
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-destructive">Expenses: {formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function ExpenseTrendChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart message="No expense trend data available." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} width={56} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#dc2626"
          strokeWidth={2}
          fill="url(#expGradient)"
          dot={{ r: 5, fill: "#dc2626" }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
