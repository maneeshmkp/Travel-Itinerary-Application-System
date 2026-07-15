"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Loader2, Plus, Receipt, ImagePlus, X } from "lucide-react"
import CurrencySelect from "../common/CurrencySelect"
import { normalizeCurrency } from "../../constants/currencies"

const EMPTY_FORM = {
  amount: "",
  category: "food",
  currency: "",
  dayNumber: "1",
  spentAt: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
  description: "",
  notes: "",
  receiptUrl: "",
}

const inputClass =
  "mt-1 w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
const labelClass = "text-xs font-medium text-muted-foreground"

export default function ExpenseForm({
  categories,
  paymentMethods,
  currency,
  totalDays = 1,
  saving,
  editingExpense,
  onSubmit,
  onCancelEdit,
  open = true,
  onToggle,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, currency })

  useEffect(() => {
    if (editingExpense) {
      setForm({
        amount: String(editingExpense.amount),
        category: editingExpense.category,
        currency: normalizeCurrency(editingExpense.currency, currency),
        dayNumber: String(editingExpense.dayNumber || 1),
        spentAt: editingExpense.spentAt
          ? new Date(editingExpense.spentAt).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        paymentMethod: editingExpense.paymentMethod || "cash",
        description: editingExpense.description || "",
        notes: editingExpense.notes || "",
        receiptUrl: editingExpense.receiptUrl || "",
      })
    } else {
      setForm({ ...EMPTY_FORM, currency })
    }
  }, [editingExpense, currency])

  const handleReceipt = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, receiptUrl: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const day = Number(form.dayNumber)
    if (!Number.isFinite(day) || day < 1 || day > totalDays) return

    await onSubmit({
      amount,
      category: form.category,
      currency: normalizeCurrency(form.currency, currency),
      dayNumber: day,
      spentAt: form.spentAt,
      paymentMethod: form.paymentMethod,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      receiptUrl: form.receiptUrl || undefined,
    })

    if (!editingExpense) {
      setForm({ ...EMPTY_FORM, currency, dayNumber: String(day) })
    }
  }

  const dayOptions = Array.from({ length: Math.max(1, totalDays) }, (_, i) => i + 1)
  const isEditing = Boolean(editingExpense)

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </span>
          {isEditing ? "Edit expense" : "Log expense"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <label className={labelClass}>
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <CurrencySelect
              value={form.currency || currency}
              onChange={(code) => setForm((f) => ({ ...f, currency: code }))}
              id="expense-currency"
              label="Currency"
              selectClassName={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Trip day <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.dayNumber}
                onChange={(e) => setForm((f) => ({ ...f, dayNumber: e.target.value }))}
                className={inputClass}
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.spentAt}
                onChange={(e) => setForm((f) => ({ ...f, spentAt: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Payment</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className={inputClass}
              >
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Lunch at café, Uber to airport…"
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={`${inputClass} h-auto py-2 resize-none`}
              placeholder="Optional details…"
            />
          </div>

          <div>
            <label className={`${labelClass} flex items-center gap-1`}>
              <ImagePlus className="h-3.5 w-3.5" />
              Receipt (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceipt}
              className="mt-1 w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary"
            />
            {form.receiptUrl ? (
              <div className="relative mt-2 inline-block">
                <img
                  src={form.receiptUrl}
                  alt="Receipt"
                  className="h-14 w-auto rounded-lg border border-border/60 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receiptUrl: "" }))}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-background border border-border p-0.5 shadow-sm"
                  aria-label="Remove receipt"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 pt-1">
            {isEditing ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 h-9 rounded-lg border border-border/60 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {isEditing ? "Save" : "Add expense"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
