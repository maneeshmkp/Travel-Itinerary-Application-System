"use client"

import { FileText, Image as ImageIcon, Star, Download, Eye } from "lucide-react"
import { documentTypeLabel, expiryBadgeClass, formatDocDate } from "../../constants/documentTypes"

export default function DocumentCard({ doc, onOpen, onFavorite, onDownload, compact }) {
  const isImage = doc.mimeType?.startsWith("image/")
  const Icon = isImage ? ImageIcon : FileText

  return (
    <article
      className={`rounded-lg border border-border bg-card hover:border-primary/40 transition-colors ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 rounded-lg bg-muted/50 border border-border overflow-hidden flex items-center justify-center">
          {doc.thumbnail ? (
            <img src={doc.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground">{documentTypeLabel(doc.documentType)}</p>
            </div>
            <button
              type="button"
              onClick={() => onFavorite?.(doc)}
              className="shrink-0 text-muted-foreground hover:text-amber-500"
              aria-label="Toggle favorite"
            >
              <Star className={`h-4 w-4 ${doc.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {doc.expiryDate ? (
              <span className={`rounded-full border px-2 py-0.5 ${expiryBadgeClass(doc.expiryStatus)}`}>
                Expires {formatDocDate(doc.expiryDate)}
              </span>
            ) : null}
            {doc.country ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{doc.country}</span>
            ) : null}
          </div>
          {!compact ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpen?.(doc)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => onDownload?.(doc)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
