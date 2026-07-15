"use client"

import { X, Download, Star, Pencil, Share2 } from "lucide-react"
import { documentTypeLabel, formatDocDate } from "../../constants/documentTypes"

export default function DocumentPreview({ doc, onClose, onDownload, onFavorite, onRename, saving }) {
  if (!doc) return null

  const ocr = doc.ocrFields || {}

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-lg truncate">{doc.title}</h3>
            <p className="text-xs text-muted-foreground">{documentTypeLabel(doc.documentType)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {doc.thumbnail ? (
            <img src={doc.thumbnail} alt={doc.title} className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted/20" />
          ) : (
            <div className="h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
              Preview not available — download to view
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onDownload?.(doc)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Download className="h-4 w-4" />
              Download
            </button>
            <button type="button" onClick={() => onFavorite?.(doc)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm">
              <Star className={`h-4 w-4 ${doc.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
              Favorite
            </button>
            <button
              type="button"
              onClick={() => {
                const title = window.prompt("Rename document", doc.title)
                if (title?.trim()) onRename?.(doc, title.trim())
              }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm"
            >
              <Pencil className="h-4 w-4" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDownload?.(doc)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm"
            >
              <Share2 className="h-4 w-4" />
              Share link
            </button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Issue date</dt>
              <dd className="font-medium">{formatDocDate(doc.issueDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expiry date</dt>
              <dd className="font-medium">{formatDocDate(doc.expiryDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document number</dt>
              <dd className="font-medium">{doc.documentNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Country</dt>
              <dd className="font-medium">{doc.country || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Issuer</dt>
              <dd className="font-medium">{doc.issuer || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">File size</dt>
              <dd className="font-medium">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "—"}</dd>
            </div>
          </dl>

          {(ocr.travelerName || ocr.passportNumber || ocr.flightNumber || ocr.bookingReference) ? (
            <div className="rounded-lg border border-border p-3 bg-muted/20">
              <p className="text-sm font-medium mb-2">OCR extracted</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {ocr.travelerName ? <li>Name: {ocr.travelerName}</li> : null}
                {ocr.passportNumber ? <li>Passport: {ocr.passportNumber}</li> : null}
                {ocr.visaNumber ? <li>Visa: {ocr.visaNumber}</li> : null}
                {ocr.flightNumber ? <li>Flight: {ocr.flightNumber}</li> : null}
                {ocr.bookingReference ? <li>Reference: {ocr.bookingReference}</li> : null}
                {ocr.hotelName ? <li>Hotel: {ocr.hotelName}</li> : null}
              </ul>
            </div>
          ) : null}

          {doc.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span key={t} className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
