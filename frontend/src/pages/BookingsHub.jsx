"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Ticket, Plus, ArrowLeft } from "lucide-react"
import { useBookings } from "../hooks/useBookings"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import BookingDashboard from "../components/bookings/BookingDashboard"
import BookingSearch from "../components/bookings/BookingSearch"
import BookingFilters from "../components/bookings/BookingFilters"
import BookingCard from "../components/bookings/BookingCard"
import BookingForm from "../components/bookings/BookingForm"
import UpcomingBookings from "../components/bookings/UpcomingBookings"
import { bookingAPI } from "../services/api"
import { useEffect } from "react"

export default function BookingsHub() {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [search, setSearch] = useState("")
  const [upcoming, setUpcoming] = useState([])
  const [formOpen, setFormOpen] = useState(false)

  const {
    items,
    dashboard,
    loading,
    saving,
    error,
    filters,
    load,
    createBooking,
    deleteBooking,
    search: runSearch,
    setFilters,
  } = useBookings({ enabled: true })

  useEffect(() => {
    bookingAPI.upcoming({ days: 14 }).then((res) => setUpcoming(res.data?.data?.items || []))
  }, [items])

  const handleFilter = (patch) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    load(next)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}

      <Link to="/itineraries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to trips
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-3xl flex items-center gap-2">
            <Ticket className="h-8 w-8 text-primary" />
            Booking Hub
          </h1>
          <p className="text-muted-foreground mt-1">Store and manage every reservation in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add booking
        </button>
      </header>

      <div className="space-y-6">
        <BookingDashboard stats={dashboard} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <BookingSearch
              value={search}
              onChange={setSearch}
              onSubmit={(q) => (q.trim() ? runSearch(q) : load())}
            />
            <BookingFilters filters={filters} onChange={handleFilter} />

            {formOpen ? (
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="text-sm font-semibold mb-3">Manual import — enter confirmation details</p>
                <BookingForm
                  saving={saving}
                  onSubmit={async (payload) => {
                    try {
                      if (!payload.tripId) {
                        showError("Select a trip on the itinerary page or pass tripId when creating.")
                        return
                      }
                      await createBooking(payload)
                      showSuccess("Booking saved")
                      setFormOpen(false)
                    } catch {
                      showError("Could not save booking")
                    }
                  }}
                  onCancel={() => setFormOpen(false)}
                />
              </div>
            ) : null}

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onDelete={(x) => {
                      if (window.confirm("Delete booking?")) deleteBooking(x.id)
                    }}
                  />
                ))}
              </div>
            )}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <aside className="rounded-xl border border-border bg-card p-4 h-fit">
            <h2 className="font-semibold text-lg mb-3">Upcoming</h2>
            <UpcomingBookings items={upcoming} />
          </aside>
        </div>
      </div>
    </div>
  )
}
