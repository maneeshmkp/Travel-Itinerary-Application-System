"use client"

import DocumentVaultPanel from "../../documents/DocumentVaultPanel"

export default function DocumentsTab({ ctx }) {
  const { itinerary } = ctx

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Passport, visa, insurance, boarding passes and vouchers — upload, preview and track expiry.
        </p>
      </div>

      <div id="documents" className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm">
        <DocumentVaultPanel tripId={itinerary._id} tripTitle={itinerary.title} />
      </div>
    </div>
  )
}
