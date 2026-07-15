"use client"

import { useRef } from "react"
import { WORKSPACE_TABS } from "./workspaceConfig"

/**
 * Sticky horizontal tab navigation (desktop/tablet).
 * Only one tab's content renders at a time, keeping the page short.
 */
export default function WorkspaceNav({ activeTab, onChange }) {
  const scrollRef = useRef(null)

  return (
    <div className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          role="tablist"
        >
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
