import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { BookingModel } from "@/models/booking.model";
import { ActivityModel } from "@/models/activity.model";
import { AssetModel } from "@/models/asset.model";

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get("assetId");

    const bookings = BookingModel.getAll({ assetId: assetId ? parseInt(assetId) : null });

    return Response.json({ bookings });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, title, description, startTime, endTime } = await request.json();

    if (!assetId || !title || !startTime || !endTime) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return Response.json({ error: "End time must be after start time" }, { status: 400 });

    const asset = AssetModel.getById(assetId);
    if (!asset || !asset.is_bookable) {
        return Response.json({ error: "Asset is not bookable" }, { status: 400 });
    }

    const invalidStatuses = ['Under Maintenance', 'Lost', 'Retired', 'Disposed'];
    if (invalidStatuses.includes(asset.status)) {
        return Response.json({ error: `Cannot book asset. Current status: ${asset.status}` }, { status: 400 });
    }

    const overlap = BookingModel.checkOverlap(assetId, startTime, endTime);
    if (overlap) {
        return Response.json({ error: "Time slot overlaps with an existing booking" }, { status: 409 });
    }

    const bookingId = BookingModel.create({
        assetId, bookedByEmployeeId: user.id, title, description, startTime, endTime
    });

    ActivityModel.log(user.id, 'CREATE', 'Booking', bookingId, `Booked ${asset.asset_tag} from ${startTime} to ${endTime}`);

    return Response.json({ message: "Resource booked successfully", id: bookingId }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
