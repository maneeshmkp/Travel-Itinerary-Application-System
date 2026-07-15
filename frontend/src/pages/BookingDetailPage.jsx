"use client"

import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useBookingDetail } from "../hooks/useBookings"
import { useBookings } from "../hooks/useBookings"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import BookingDetails from "../components/bookings/BookingDetails"

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { booking, loading, refresh } = useBookingDetail(id)
  const { deleteBooking, convertToExpense, saving } = useBookings({ enabled: false, autoLoad: false })
  const { toasts, showSuccess, showError, removeToast } = useToast()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}

      <Link to="/bookings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        All bookings
      </Link>

      <BookingDetails
        booking={booking}
        loading={loading}
        converting={saving}
        onConvertExpense={async () => {
          try {
            await convertToExpense(id)
            showSuccess("Added to expense tracker")
            refresh()
          } catch {
            showError("Could not convert to expense")
          }
        }}
        onDelete={async () => {
          if (!window.confirm("Delete this booking?")) return
          await deleteBooking(id)
          showSuccess("Booking deleted")
          navigate("/bookings")
        }}
      />
    </div>
  )
}
