import { useState } from "react"
import { Users, Link2, Copy, Loader2, UserPlus } from "lucide-react"
import { Link } from "react-router-dom"
import { itineraryAPI } from "../services/api"
import { getCollaborateUrl } from "../utils/shareUrl"

export default function CollaboratePanel({
  itineraryId,
  collaboration,
  isAuthenticated,
  onUpdated,
  showSuccess,
  showError,
}) {
  const [enableLoading, setEnableLoading] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)

  if (!itineraryId) return null

  const collab = collaboration || {}
  const collaborateUrl =
    collab.collaborateUrl ||
    (collab.collaborateToken ? getCollaborateUrl(itineraryId, collab.collaborateToken) : "")

  const handleEnable = async () => {
    setEnableLoading(true)
    try {
      const res = await itineraryAPI.enableCollaboration(itineraryId)
      showSuccess?.(res.data?.message || "Collaborative editing enabled")
      onUpdated?.(res.data?.data?.collaboration)
    } catch (err) {
      showError?.(err.message || "Could not enable collaboration")
    } finally {
      setEnableLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!collaborateUrl) return
    setCopyLoading(true)
    try {
      await navigator.clipboard.writeText(collaborateUrl)
      showSuccess?.("Collaboration link copied — send it to your travel companions")
    } catch {
      showError?.("Could not copy link")
    } finally {
      setCopyLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Users className="h-4 w-4 text-primary shrink-0" />
        Plan together
      </div>

      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>{" "}
          to invite others and edit this trip with your group.
        </p>
      ) : collab.isOwner ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {collab.collaborateEnabled
            ? "You own this trip. Share the edit link so others can help plan."
            : "You own this trip. Enable collaborative editing to invite others."}
        </p>
      ) : collab.canEdit ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          You can edit this itinerary as a collaborator.
        </p>
      ) : collab.collaborateEnabled ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ask the trip owner for the collaboration link to join and edit.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Enable collaborative editing to invite friends and family to help update this itinerary.
        </p>
      )}

      {isAuthenticated &&
      !collab.collaborateEnabled &&
      (collab.isOwner || !collab.owner) ? (
        <button
          type="button"
          onClick={handleEnable}
          disabled={enableLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {enableLoading ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <UserPlus className="h-4 w-4 shrink-0" />
          )}
          Enable collaborative editing
        </button>
      ) : null}

      {isAuthenticated && collab.isOwner && collab.collaborateEnabled && collaborateUrl ? (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={collaborateUrl}
              className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg border border-border bg-background text-muted-foreground truncate"
              aria-label="Collaboration edit link"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={copyLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-60 shrink-0"
              title="Copy collaboration link"
            >
              {copyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Copy</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Anyone with this link can join after logging in and edit the trip with you.
          </p>
        </>
      ) : null}

      {collab.collaborators?.length > 0 ? (
        <div className="pt-1">
          <p className="text-xs font-medium text-foreground mb-1.5">Collaborators</p>
          <ul className="space-y-1">
            {collab.collaborators.map((c) => (
              <li key={c.userId} className="text-xs text-muted-foreground">
                {c.name || c.email || "Travel companion"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
