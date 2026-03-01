"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyChart } from "./empty-chart";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  name: string;
  value: number;
}

// Distinct accessible palette
const PALETTE = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706",
  "#7c3aed", "#0891b2", "#db2777", "#65a30d",
];

export function ExpenseDonutChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart message="No expense data available." />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [formatCurrency(v), "Expense"]} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 11, maxWidth: 160 }}
          formatter={(name) =>
            name.length > 22 ? name.slice(0, 21) + "…" : name
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
