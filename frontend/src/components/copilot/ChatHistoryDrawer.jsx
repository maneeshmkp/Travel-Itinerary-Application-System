"use client"

import { useEffect, useState } from "react"
import { History, Trash2, Pencil, Plus, X, Loader2 } from "lucide-react"
import { copilotAPI } from "../../services/copilotApi"

export default function ChatHistoryDrawer({ open, onClose, currentSessionId, onSelectSession, onNewChat }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    copilotAPI
      .listSessions()
      .then((res) => setSessions(res.data?.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm("Delete this chat?")) return
    await copilotAPI.deleteSession(id)
    setSessions((s) => s.filter((x) => x.id !== id))
    if (currentSessionId === id) onNewChat?.()
  }

  const handleRename = async (id) => {
    if (!editTitle.trim()) return
    await copilotAPI.renameSession(id, editTitle.trim())
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, title: editTitle.trim() } : x)))
    setEditingId(null)
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-10 bg-background/98 flex flex-col border-r border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Past chats
        </span>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-muted" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onNewChat?.()
          onClose()
        }}
        className="mx-3 mt-3 flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary/5"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No saved chats yet</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectSession?.(s.id)
                onClose()
              }}
              onKeyDown={(e) => e.key === "Enter" && onSelectSession?.(s.id)}
              className={`group flex items-start gap-2 rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors ${
                currentSessionId === s.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"
              }`}
            >
              <div className="flex-1 min-w-0">
                {editingId === s.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(s.id)}
                    className="w-full text-sm border border-border rounded px-2 py-0.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-sm font-medium truncate">{s.title}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString() : ""}
                </p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(s.id)
                    setEditTitle(s.title)
                  }}
                  aria-label="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  onClick={(e) => handleDelete(s.id, e)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
