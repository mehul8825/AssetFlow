import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/bookings/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const bookingId = parseInt(id);
    const { action, status } = await request.json(); // action can be 'cancel' or 'update_status'

    const db = getDb();
    const booking = db.prepare("SELECT * FROM resource_bookings WHERE id = ?").get(bookingId) as any;
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    // Ensure the user owns the booking or is an admin/manager
    if (booking.booked_by_employee_id !== user.id && !["Admin", "Asset Manager", "Department Head"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "cancel") {
      db.prepare("UPDATE resource_bookings SET status = 'Cancelled', updated_at = datetime('now') WHERE id = ?").run(bookingId);
      
      db.prepare(
        `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
         VALUES (?, 'CANCEL', 'Booking', ?, ?)`
      ).run(user.id, bookingId, `Cancelled booking: ${booking.title}`);
      
      // Notify
      db.prepare(
        `INSERT INTO notifications (employee_id, title, message, type)
         VALUES (?, 'Booking Cancelled', ?, 'BOOKING_CANCELLED')`
      ).run(booking.booked_by_employee_id, `Your booking "${booking.title}" has been cancelled.`);
      
      return Response.json({ message: "Booking cancelled" });
    } else if (status) {
        db.prepare("UPDATE resource_bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, bookingId);
        return Response.json({ message: "Booking status updated" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
