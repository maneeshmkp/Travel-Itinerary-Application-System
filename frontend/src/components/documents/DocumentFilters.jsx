"use client"

import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS } from "../../constants/documentTypes"

export default function DocumentFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.documentType || ""}
        onChange={(e) => onChange({ documentType: e.target.value || undefined })}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All types</option>
        {DOCUMENT_TYPE_IDS.map((id) => (
          <option key={id} value={id}>
            {DOCUMENT_TYPE_LABELS[id]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange({ favorites: filters.favorites ? undefined : "true" })}
        className={`rounded-lg border px-3 py-2 text-sm ${filters.favorites ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
      >
        Favorites
      </button>
      <button
        type="button"
        onClick={() => onChange({ expiringSoon: filters.expiringSoon ? undefined : "true" })}
        className={`rounded-lg border px-3 py-2 text-sm ${filters.expiringSoon ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-border"}`}
      >
        Expiring soon
      </button>
      <button
        type="button"
        onClick={() => onChange({ expired: filters.expired ? undefined : "true" })}
        className={`rounded-lg border px-3 py-2 text-sm ${filters.expired ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-border"}`}
      >
        Expired
      </button>
      <select
        value={filters.sort || "newest"}
        onChange={(e) => onChange({ sort: e.target.value })}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="expiry">Expiry date</option>
      </select>
    </div>
  )
}
