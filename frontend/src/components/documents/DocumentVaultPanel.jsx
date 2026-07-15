"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { FolderLock, Loader2, Sparkles } from "lucide-react"
import { useDocumentVault } from "../../hooks/useDocumentVault"
import DocumentCard from "./DocumentCard"
import DocumentUpload from "./DocumentUpload"
import DocumentPreview from "./DocumentPreview"
import DocumentSearch from "./DocumentSearch"
import DocumentFilters from "./DocumentFilters"
import MissingDocuments from "./MissingDocuments"
import { TRIP_ESSENTIAL_TYPES, documentTypeLabel } from "../../constants/documentTypes"

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
      ))}
    </div>
  )
}

export default function DocumentVaultPanel({ tripId, tripTitle }) {
  const [search, setSearch] = useState("")
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiAnswer, setAiAnswer] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  const {
    items,
    missing,
    loading,
    saving,
    error,
    filters,
    selected,
    load,
    uploadDocument,
    updateDocument,
    deleteDocument,
    toggleFavorite,
    downloadDocument,
    searchDocuments,
    askAi,
    openDocument,
    setSelected,
  } = useDocumentVault({ tripId, enabled: true })

  const essentials = TRIP_ESSENTIAL_TYPES.map((type) => ({
    type,
    label: documentTypeLabel(type),
    doc: items.find((d) => d.documentType === type),
  }))

  const handleAi = async (q) => {
    const question = q || aiQuestion
    if (!question.trim()) return
    setAiLoading(true)
    try {
      const res = await askAi(question)
      setAiAnswer(res?.answer || "No answer")
    } catch {
      setAiAnswer("Could not reach AI assistant.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <FolderLock className="h-5 w-5 text-primary" />
            Travel Documents
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground mt-0.5">{tripTitle}</p> : null}
        </div>
        <Link to="/documents" className="text-xs font-medium text-primary hover:underline shrink-0">
          Open full vault →
        </Link>
      </div>

      <MissingDocuments missing={missing} loading={loading} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {essentials.map(({ type, label, doc }) => (
          <div
            key={type}
            className={`rounded-lg border px-2 py-2 text-center text-xs ${
              doc ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            <p className="font-medium truncate">{label}</p>
            <p className="mt-0.5">{doc ? "✓ On file" : "Missing"}</p>
          </div>
        ))}
      </div>

      <DocumentUpload onUpload={uploadDocument} saving={saving} tripId={tripId} />

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <DocumentSearch value={search} onChange={setSearch} onSubmit={searchDocuments} />
        </div>
        <DocumentFilters
          filters={filters}
          onChange={(patch) => load({ ...filters, ...patch, page: 1 })}
        />
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {loading ? (
        <SkeletonGrid />
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={(d) => openDocument(d.id)}
              onFavorite={(d) => toggleFavorite(d.id)}
              onDownload={(d) => downloadDocument(d.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No documents for this trip yet. Upload passport, visa, tickets, or insurance above.
        </p>
      )}

      <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Ask about your documents
        </p>
        <div className="flex flex-wrap gap-2">
          {["When does my passport expire?", "Do I have travel insurance?", "Which documents are missing?"].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setAiQuestion(q)
                handleAi(q)
              }}
              className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Ask about passports, visas, vouchers…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => handleAi()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </button>
        </div>
        {aiAnswer ? <p className="text-sm text-muted-foreground border-t border-border pt-2">{aiAnswer}</p> : null}
      </div>

      {selected ? (
        <DocumentPreview
          doc={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onDownload={(d) => downloadDocument(d.id)}
          onFavorite={(d) => toggleFavorite(d.id)}
          onRename={(d, title) => updateDocument(d.id, { title })}
        />
      ) : null}
    </div>
  )
}
