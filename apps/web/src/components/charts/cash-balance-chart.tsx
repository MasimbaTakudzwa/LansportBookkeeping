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
  date: string;
  balance: number;
}

const tickFormatter = (v: number) =>
  `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

export function CashBalanceChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart message="No cash movement data available." />;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} width={52} />
        <Tooltip formatter={(v: number) => [formatCurrency(v), "Cash Balance"]} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#cashGradient)"
          dot={{ r: 4, fill: "#2563eb" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
