"use client"

import { WORKSPACE_TABS, MOBILE_TABS } from "./workspaceConfig"
import { MoreHorizontal } from "lucide-react"
import { useState } from "react"

/**
 * Bottom navigation for mobile. Primary tabs are pinned; the rest live behind
 * a "More" sheet so vertical scrolling stays minimal.
 */
export default function MobileTabBar({ activeTab, onChange }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const primary = WORKSPACE_TABS.filter((t) => MOBILE_TABS.includes(t.id))
  const overflow = WORKSPACE_TABS.filter((t) => !MOBILE_TABS.includes(t.id))

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {primary.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
              overflow.some((t) => t.id === activeTab) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {sheetOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full rounded-t-2xl bg-card border-t border-border p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="grid grid-cols-3 gap-3">
              {overflow.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onChange(tab.id)
                      setSheetOpen(false)
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium ${
                      active ? "border-primary text-primary bg-primary/5" : "border-border text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
