"use client"

import { useRef, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { ACCEPT_UPLOAD, DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS, MAX_DOCUMENT_MB } from "../../constants/documentTypes"

export default function DocumentUpload({ onUpload, saving, tripId, defaultType = "other" }) {
  const inputRef = useRef(null)
  const [documentType, setDocumentType] = useState(defaultType)
  const [title, setTitle] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState("")

  const handleFile = async (file) => {
    if (!file) return
    setError("")
    if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) {
      setError(`Max file size is ${MAX_DOCUMENT_MB}MB`)
      return
    }
    try {
      await onUpload?.(file, {
        documentType,
        title: title || file.name,
        country,
        tripId,
        isPersonal: !tripId,
      })
      setTitle("")
      setCountry("")
      if (inputRef.current) inputRef.current.value = ""
    } catch (e) {
      setError(e.message || "Upload failed")
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3 bg-muted/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Document type</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {DOCUMENT_TYPE_IDS.map((id) => (
              <option key={id} value={id}>
                {DOCUMENT_TYPE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Title (optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Passport scan"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">Country (optional)</span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. India"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
        {saving ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
        <span className="text-sm font-medium text-foreground">
          {saving ? "Uploading & scanning…" : "Click to upload PDF, image, or DOCX"}
        </span>
        <span className="text-xs text-muted-foreground">Max {MAX_DOCUMENT_MB}MB</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_UPLOAD}
          className="hidden"
          disabled={saving}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
