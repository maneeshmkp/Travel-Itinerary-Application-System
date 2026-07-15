"use client"

import { useRef } from "react"
import { Paperclip, X, Download } from "lucide-react"
import { ATTACHMENT_CATEGORIES } from "../../constants/bookingTypes"

const MAX_BYTES = 2 * 1024 * 1024

export default function BookingUpload({ attachments = [], onChange }) {
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const list = Array.from(files || [])
    const next = [...attachments]
    for (const file of list) {
      if (file.size > MAX_BYTES) continue
      const reader = new FileReader()
      reader.onload = () => {
        next.push({
          id: crypto.randomUUID?.() || `f-${Date.now()}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          category: "other",
          dataUrl: reader.result,
        })
        onChange?.(next.slice(0, 10))
      }
      reader.readAsDataURL(file)
    }
  }

  const remove = (id) => onChange?.(attachments.filter((a) => a.id !== id))

  const download = (att) => {
    const a = document.createElement("a")
    a.href = att.dataUrl
    a.download = att.name || "document"
    a.click()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Documents</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Upload PDF / image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Max 2MB per file. Tickets, vouchers, boarding passes, insurance.</p>
      <ul className="space-y-2">
        {attachments.map((att) => (
          <li key={att.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            {att.mimeType?.startsWith("image/") && att.dataUrl ? (
              <img src={att.dataUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
            ) : (
              <span className="text-lg shrink-0">📄</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{att.name}</p>
              <select
                value={att.category || "other"}
                onChange={(e) =>
                  onChange?.(attachments.map((a) => (a.id === att.id ? { ...a, category: e.target.value } : a)))
                }
                className="mt-0.5 text-xs border border-border rounded px-1 py-0.5 bg-background"
              >
                {ATTACHMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            {att.dataUrl ? (
              <button type="button" onClick={() => download(att)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Download">
                <Download className="h-4 w-4" />
              </button>
            ) : null}
            <button type="button" onClick={() => remove(att.id)} className="p-1 text-red-600" aria-label="Remove">
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
