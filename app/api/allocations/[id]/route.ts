import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/allocations/[id] - Return asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const allocId = parseInt(id);
    const { action, returnCondition, returnNotes, status: newStatus } = await request.json();

    const db = getDb();
    const alloc = db.prepare(
      `SELECT aa.*, a.name as assetName, a.asset_tag as assetTag
       FROM asset_allocations aa JOIN assets a ON a.id = aa.asset_id WHERE aa.id = ?`
    ).get(allocId) as any;
    if (!alloc) return Response.json({ error: "Allocation not found" }, { status: 404 });

    if (action === "return") {
      db.prepare(
        `UPDATE asset_allocations SET status = 'Returned', actual_return_date = datetime('now'),
         return_condition = ?, return_notes = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(returnCondition || null, returnNotes || null, allocId);

      db.prepare("UPDATE assets SET status = 'Available', updated_at = datetime('now') WHERE id = ?").run(alloc.asset_id);

      db.prepare(
        `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
         VALUES (?, 'RETURN', 'Asset', ?, ?)`
      ).run(user.id, alloc.asset_id, `Returned ${alloc.assetName} (${alloc.assetTag})`);

      return Response.json({ message: "Asset returned successfully" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Update allocation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
