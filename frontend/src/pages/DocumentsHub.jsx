"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { FolderLock, ArrowLeft, Loader2 } from "lucide-react"
import { useDocumentVault } from "../hooks/useDocumentVault"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import DocumentCard from "../components/documents/DocumentCard"
import DocumentUpload from "../components/documents/DocumentUpload"
import DocumentPreview from "../components/documents/DocumentPreview"
import DocumentSearch from "../components/documents/DocumentSearch"
import DocumentFilters from "../components/documents/DocumentFilters"
import ExpiryTimeline from "../components/documents/ExpiryTimeline"
import FavoriteDocuments from "../components/documents/FavoriteDocuments"

export default function DocumentsHub() {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [search, setSearch] = useState("")
  const [showUpload, setShowUpload] = useState(false)

  const {
    items,
    stats,
    timeline,
    loading,
    saving,
    error,
    filters,
    selected,
    pagination,
    load,
    uploadDocument,
    updateDocument,
    deleteDocument,
    toggleFavorite,
    downloadDocument,
    searchDocuments,
    openDocument,
    setSelected,
  } = useDocumentVault({ enabled: true })

  const handleUpload = async (file, meta) => {
    try {
      await uploadDocument(file, meta)
      showSuccess("Document uploaded securely")
      setShowUpload(false)
    } catch (e) {
      showError(e.message || "Upload failed")
      throw e
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}

      <Link to="/itineraries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to trips
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FolderLock className="h-7 w-7 text-primary" />
            Document Vault
          </h1>
          <p className="text-muted-foreground mt-1">Securely store passports, visas, tickets, and travel insurance.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          {showUpload ? "Hide upload" : "Upload document"}
        </button>
      </header>

      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total },
            { label: "Favorites", value: stats.favorites },
            { label: "Expiring", value: stats.expiring },
            { label: "Expired", value: stats.expired },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {showUpload ? (
        <div className="mb-6">
          <DocumentUpload onUpload={handleUpload} saving={saving} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <DocumentSearch value={search} onChange={setSearch} onSubmit={searchDocuments} />
          <DocumentFilters filters={filters} onChange={(patch) => load({ ...filters, ...patch, page: 1 })} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
            <p className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
              Your vault is empty. Upload your first travel document.
            </p>
          )}
          {pagination.pages > 1 ? (
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => load({ ...filters, page: pagination.page - 1 })}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground self-center">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => load({ ...filters, page: pagination.page + 1 })}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading font-semibold mb-3">Favorites</h2>
            <FavoriteDocuments
              items={items}
              onOpen={(d) => openDocument(d.id)}
              onFavorite={(d) => toggleFavorite(d.id)}
              onDownload={(d) => downloadDocument(d.id)}
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading font-semibold mb-3">Expiry timeline</h2>
            <ExpiryTimeline items={timeline} loading={loading} />
          </div>
        </aside>
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
