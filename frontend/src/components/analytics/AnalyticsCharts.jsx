"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const val = item.value ?? item.payload?.value ?? item.payload?.planned
  const isMoney = typeof val === "number" && val > 100
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{item.payload?.label || item.payload?.name || item.name}</p>
      <p className="text-muted-foreground">{isMoney ? formatMoney(val, currency) : val}</p>
    </div>
  )
}

export default function AnalyticsCharts({ charts, currency = DEFAULT_CURRENCY }) {
  if (!charts) return null

  const { tripsPerMonth = [], moneySpent = [], budgetVsActual = [], countries = [], categories = [], travelDays = [], savings = [] } = charts

  const hasAny =
    tripsPerMonth.length || moneySpent.length || budgetVsActual.length || countries.length || categories.length

  if (!hasAny) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {tripsPerMonth.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Trips per month</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tripsPerMonth}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {moneySpent.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Money spent</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moneySpent}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {budgetVsActual.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Budget vs actual</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActual}>
                <XAxis dataKey="trip" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill="#94a3b8" />
                <Bar dataKey="actual" name="Actual" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {countries.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Countries visited</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={countries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {countries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Favorite categories</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories.slice(0, 8)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {travelDays.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">Travel days</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={travelDays}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {savings.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2">AI savings</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savings}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
