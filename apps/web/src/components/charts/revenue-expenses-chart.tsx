"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { EmptyChart } from "./empty-chart";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  period: string;
  revenue: number;
  expenses: number;
}

const tickFormatter = (v: number) =>
  `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

export function RevenueExpensesChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart message="No revenue / expense data for this period." />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} width={52} />
        <Tooltip
          formatter={(v: number, name: string) => [
            formatCurrency(v),
            name.charAt(0).toUpperCase() + name.slice(1),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue"  fill="#16a34a" radius={[3, 3, 0, 0]} name="Revenue"  />
        <Bar dataKey="expenses" fill="#dc2626" radius={[3, 3, 0, 0]} name="Expenses" />
      </BarChart>
    </ResponsiveContainer>
  );
}
