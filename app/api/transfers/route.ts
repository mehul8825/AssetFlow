import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/transfers
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const transfers = db.prepare(
      `SELECT tr.id, tr.asset_id as assetId, tr.status, tr.reason, tr.rejection_reason as rejectionReason,
              tr.created_at as createdAt,
              a.name as assetName, a.asset_tag as assetTag,
              fe.name as fromEmployeeName, te.name as toEmployeeName,
              re.name as requestedByName, ae.name as approvedByName
       FROM transfer_requests tr
       JOIN assets a ON a.id = tr.asset_id
       LEFT JOIN employees fe ON fe.id = tr.from_employee_id
       JOIN employees te ON te.id = tr.to_employee_id
       JOIN employees re ON re.id = tr.requested_by_employee_id
       LEFT JOIN employees ae ON ae.id = tr.approved_by_employee_id
       ORDER BY tr.created_at DESC`
    ).all();

    return Response.json({ transfers });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/transfers
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, toEmployeeId, reason } = await request.json();
    if (!assetId || !toEmployeeId) return Response.json({ error: "Asset and target employee are required" }, { status: 400 });

    const db = getDb();

    // Find current holder
    const currentAlloc = db.prepare(
      "SELECT allocated_to_employee_id FROM asset_allocations WHERE asset_id = ? AND status = 'Active' LIMIT 1"
    ).get(assetId) as any;

    const result = db.prepare(
      `INSERT INTO transfer_requests (asset_id, from_employee_id, to_employee_id, requested_by_employee_id, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Requested')`
    ).run(assetId, currentAlloc?.allocated_to_employee_id || null, toEmployeeId, user.id, reason || null);

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Transfer', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Requested transfer for asset ${assetId}`);

    return Response.json({ message: "Transfer request created", id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
