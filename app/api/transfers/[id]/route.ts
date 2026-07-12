import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/transfers/[id] - Approve/Reject/Complete
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role))
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const trId = parseInt(id);
    const { action, rejectionReason } = await request.json();

    const db = getDb();
    const tr = db.prepare(
      `SELECT tr.*, a.name as assetName, a.asset_tag as assetTag
       FROM transfer_requests tr JOIN assets a ON a.id = tr.asset_id WHERE tr.id = ?`
    ).get(trId) as any;
    if (!tr) return Response.json({ error: "Transfer not found" }, { status: 404 });

    if (action === "approve") {
      db.prepare("UPDATE transfer_requests SET status = 'Approved', approved_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(user.id, trId);

      // Mark old allocation as Transferred
      if (tr.from_employee_id) {
        db.prepare("UPDATE asset_allocations SET status = 'Transferred', updated_at = datetime('now') WHERE asset_id = ? AND status = 'Active'")
          .run(tr.asset_id);
      }

      // Create new allocation
      db.prepare(
        `INSERT INTO asset_allocations (asset_id, allocated_to_employee_id, allocated_by_employee_id, status)
         VALUES (?, ?, ?, 'Active')`
      ).run(tr.asset_id, tr.to_employee_id, user.id);

      db.prepare("UPDATE transfer_requests SET status = 'Completed', updated_at = datetime('now') WHERE id = ?").run(trId);

      // Notify
      db.prepare(
        `INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'Transfer Approved', ?, 'TRANSFER_APPROVED', '/dashboard/allocations')`
      ).run(tr.requested_by_employee_id, `Transfer of ${tr.assetName} (${tr.assetTag}) has been approved.`);

      db.prepare(
        `INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'Asset Assigned', ?, 'ASSET_ASSIGNED', '/dashboard/allocations')`
      ).run(tr.to_employee_id, `${tr.assetName} (${tr.assetTag}) has been transferred to you.`);

      db.prepare(
        `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
         VALUES (?, 'APPROVE_TRANSFER', 'Transfer', ?, ?)`
      ).run(user.id, trId, `Approved transfer of ${tr.assetName}`);

      return Response.json({ message: "Transfer approved and completed" });
    }

    if (action === "reject") {
      db.prepare("UPDATE transfer_requests SET status = 'Rejected', approved_by_employee_id = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?")
        .run(user.id, rejectionReason || null, trId);

      db.prepare(
        `INSERT INTO notifications (employee_id, title, message, type) VALUES (?, 'Transfer Rejected', ?, 'TRANSFER_REJECTED')`
      ).run(tr.requested_by_employee_id, `Transfer of ${tr.assetName} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`);

      return Response.json({ message: "Transfer rejected" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
