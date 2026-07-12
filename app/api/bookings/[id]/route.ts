import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { BookingModel } from "@/models/booking.model";
import { ActivityModel } from "@/models/activity.model";

// PUT /api/bookings/[id] - Cancel booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const bookingId = parseInt(id);
    const { action } = await request.json();

    const booking = BookingModel.getById(bookingId);
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    if (action === 'cancel') {
        if (booking.booked_by_employee_id !== user.id && !["Admin", "Asset Manager"].includes(user.role)) {
            return Response.json({ error: "Forbidden to cancel others booking" }, { status: 403 });
        }
        BookingModel.updateStatus(bookingId, 'Cancelled');
        ActivityModel.log(user.id, 'CANCEL', 'Booking', bookingId, `Cancelled booking ${bookingId}`);
    } else if (action === 'complete') {
         if (!["Admin", "Asset Manager"].includes(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
         BookingModel.updateStatus(bookingId, 'Completed');
    }

    return Response.json({ message: `Booking ${action}ed` });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
