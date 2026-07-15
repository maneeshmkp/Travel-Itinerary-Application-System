"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { formatMoney } from "../../utils/budgetCalculations"

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{item.payload?.name || item.payload?.category || item.name}</p>
      <p className="text-muted-foreground">{formatMoney(item.value, currency)}</p>
    </div>
  )
}

export default function BudgetCharts({ charts, currency }) {
  const comparison = charts?.comparison || []
  const category = charts?.category || []
  const forecast = charts?.forecast || []

  if (!comparison.length && !category.length) return null

  return (
    <div className="space-y-6">
      {comparison.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Current vs optimized</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {category.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Category breakdown</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="optimized" name="Optimized" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {forecast.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Expense forecast</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
