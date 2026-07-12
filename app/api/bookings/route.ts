import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const assetId = request.nextUrl.searchParams.get("assetId");

    let query = `
      SELECT rb.id, rb.asset_id as assetId, rb.booked_by_employee_id as bookedByEmployeeId,
             rb.title, rb.description, rb.start_time as startTime, rb.end_time as endTime,
             rb.status, rb.created_at as createdAt,
             a.name as assetName, a.asset_tag as assetTag, a.location,
             e.name as bookedByName
      FROM resource_bookings rb
      JOIN assets a ON a.id = rb.asset_id
      JOIN employees e ON e.id = rb.booked_by_employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (assetId) { query += " AND rb.asset_id = ?"; params.push(parseInt(assetId)); }
    query += " ORDER BY rb.start_time ASC";

    const bookings = db.prepare(query).all(...params);
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
    if (!assetId || !title || !startTime || !endTime)
      return Response.json({ error: "Asset, title, start and end time are required" }, { status: 400 });

    if (new Date(startTime) >= new Date(endTime))
      return Response.json({ error: "End time must be after start time" }, { status: 400 });

    const db = getDb();

    // Check asset is bookable
    const asset = db.prepare("SELECT id, name, asset_tag, is_bookable FROM assets WHERE id = ?").get(assetId) as any;
    if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });
    if (!asset.is_bookable) return Response.json({ error: "This asset is not bookable" }, { status: 400 });

    // Overlap validation: reject if any active booking overlaps
    const overlap = db.prepare(
      `SELECT id, title, start_time, end_time FROM resource_bookings
       WHERE asset_id = ? AND status IN ('Upcoming', 'Ongoing')
       AND start_time < ? AND end_time > ?`
    ).get(assetId, endTime, startTime) as any;

    if (overlap) {
      return Response.json({
        error: `Time slot overlaps with "${overlap.title}" (${new Date(overlap.start_time).toLocaleString()} - ${new Date(overlap.end_time).toLocaleString()})`,
      }, { status: 409 });
    }

    const result = db.prepare(
      `INSERT INTO resource_bookings (asset_id, booked_by_employee_id, title, description, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Upcoming')`
    ).run(assetId, user.id, title, description || null, startTime, endTime);

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Booking', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Booked ${asset.name} (${asset.asset_tag}): ${title}`);

    db.prepare(
      `INSERT INTO notifications (employee_id, title, message, type, link)
       VALUES (?, 'Booking Confirmed', ?, 'BOOKING_CONFIRMED', '/dashboard/bookings')`
    ).run(user.id, `Your booking "${title}" for ${asset.name} is confirmed.`);

    return Response.json({ message: "Booking created", id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
