import { CURRENCY_OPTIONS, normalizeCurrency } from "../../constants/currencies.js"

export default function CurrencySelect({
  value,
  onChange,
  id = "currency",
  label = "Currency",
  required = true,
  className = "",
  selectClassName = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm",
}) {
  const normalized = normalizeCurrency(value)

  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      <select
        id={id}
        required={required}
        value={normalized}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.label}
          </option>
        ))}
      </select>
    </div>
  )
}
