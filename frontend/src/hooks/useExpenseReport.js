import { useCallback, useEffect, useState } from "react"
import { itineraryAPI } from "../services/api"
import { EXPENSE_CATEGORY_OPTIONS } from "../constants/expenseCategories"
import { PAYMENT_METHOD_OPTIONS } from "../constants/paymentMethods"
import { DEFAULT_CURRENCY, normalizeCurrency } from "../constants/currencies"
import { downloadBlob } from "../components/expenses/expenseUtils"

export function useExpenseReport(itineraryId, defaultCurrency = DEFAULT_CURRENCY) {
  const [report, setReport] = useState(null)
  const [categories, setCategories] = useState(EXPENSE_CATEGORY_OPTIONS)
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHOD_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!itineraryId) return
    setLoading(true)
    setError(null)
    try {
      const res = await itineraryAPI.getExpenses(itineraryId)
      setReport(res.data?.data ?? null)
      if (res.data?.categories?.length) setCategories(res.data.categories)
      if (res.data?.paymentMethods?.length) setPaymentMethods(res.data.paymentMethods)
    } catch (err) {
      setError(err.message || "Could not load expenses")
    } finally {
      setLoading(false)
    }
  }, [itineraryId])

  useEffect(() => {
    load()
  }, [load])

  const runWithSaving = useCallback(async (fn) => {
    setSaving(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err.message || "Request failed")
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const addExpense = useCallback(
    async (payload) => {
      const res = await itineraryAPI.addExpense(itineraryId, payload)
      setReport(res.data?.data?.report ?? null)
      return res.data?.data?.expense
    },
    [itineraryId],
  )

  const updateExpense = useCallback(
    async (expenseId, payload) => {
      const res = await itineraryAPI.updateExpense(itineraryId, expenseId, payload)
      setReport(res.data?.data?.report ?? null)
      return res.data?.data?.expense
    },
    [itineraryId],
  )

  const deleteExpense = useCallback(
    async (expenseId) => {
      const res = await itineraryAPI.deleteExpense(itineraryId, expenseId)
      setReport(res.data?.data ?? null)
    },
    [itineraryId],
  )

  const duplicateExpense = useCallback(
    async (expenseId) => {
      const res = await itineraryAPI.duplicateExpense(itineraryId, expenseId)
      setReport(res.data?.data?.report ?? null)
      return res.data?.data?.expense
    },
    [itineraryId],
  )

  const exportCsv = useCallback(async () => {
    await runWithSaving(async () => {
      const res = await itineraryAPI.exportExpensesCsv(itineraryId)
      downloadBlob(res.data, `expenses-${itineraryId}.csv`)
    })
  }, [itineraryId, runWithSaving])

  const exportPdf = useCallback(async () => {
    await runWithSaving(async () => {
      const res = await itineraryAPI.exportExpensesPdf(itineraryId)
      downloadBlob(res.data, `expenses-${itineraryId}.pdf`)
    })
  }, [itineraryId, runWithSaving])

  const currency = normalizeCurrency(report?.currency || defaultCurrency)

  return {
    report,
    categories,
    paymentMethods,
    currency,
    loading,
    saving,
    error,
    setError,
    reload: load,
    addExpense: (payload) => runWithSaving(() => addExpense(payload)),
    updateExpense: (id, payload) => runWithSaving(() => updateExpense(id, payload)),
    deleteExpense: (id) => runWithSaving(() => deleteExpense(id)),
    duplicateExpense: (id) => runWithSaving(() => duplicateExpense(id)),
    exportCsv,
    exportPdf,
  }
}
