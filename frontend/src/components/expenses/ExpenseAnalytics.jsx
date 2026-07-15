import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatMoney } from "../../utils/budgetCalculations"

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
]

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const value = item.value ?? item.payload?.amount ?? item.payload?.cumulative
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{item.name || item.payload?.day}</p>
      <p className="text-muted-foreground">{formatMoney(value, currency)}</p>
    </div>
  )
}

export default function ExpenseAnalytics({ charts, currency }) {
  const pie = charts?.pie ?? []
  const bar = charts?.bar ?? []
  const line = charts?.line ?? []

  if (!pie.length && !bar.length && !line.length) {
    return null
  }

  return (
    <div className="space-y-6">
      {pie.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Expense by category</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {pie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {bar.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Expense by day</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bar}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {line.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Cumulative spending</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={line}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
