"use client"

import { Star } from "lucide-react"
import DocumentCard from "./DocumentCard"

export default function FavoriteDocuments({ items = [], onOpen, onFavorite, onDownload }) {
  const favorites = items.filter((d) => d.isFavorite)
  if (!favorites.length) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
        <Star className="h-4 w-4" />
        Star documents for quick access here.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {favorites.slice(0, 4).map((doc) => (
        <DocumentCard key={doc.id} doc={doc} compact onOpen={onOpen} onFavorite={onFavorite} onDownload={onDownload} />
      ))}
    </div>
  )
}
