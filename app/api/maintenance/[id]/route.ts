import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/maintenance/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const reqId = parseInt(id);
    const { action, assignedTechnician, resolutionNotes } = await request.json();

    const db = getDb();
    const mReq = db.prepare(
      `SELECT mr.*, a.name as assetName, a.asset_tag as assetTag 
       FROM maintenance_requests mr JOIN assets a ON a.id = mr.asset_id WHERE mr.id = ?`
    ).get(reqId) as any;
    
    if (!mReq) return Response.json({ error: "Request not found" }, { status: 404 });

    if (action === "approve") {
        db.prepare("UPDATE maintenance_requests SET status = 'Approved', approved_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?").run(user.id, reqId);
        db.prepare("UPDATE assets SET status = 'Under Maintenance', updated_at = datetime('now') WHERE id = ?").run(mReq.asset_id);
        
        db.prepare(`INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details) VALUES (?, 'APPROVE_MAINTENANCE', 'Maintenance', ?, ?)`).run(user.id, reqId, `Approved maintenance for ${mReq.assetName}`);
        
        db.prepare(`INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'Maintenance Approved', ?, 'MAINTENANCE_APPROVED', '/dashboard/maintenance')`).run(mReq.requested_by_employee_id, `Your maintenance request for ${mReq.assetName} has been approved.`);
        
        return Response.json({ message: "Request approved" });
    }

    if (action === "reject") {
        db.prepare("UPDATE maintenance_requests SET status = 'Rejected', approved_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?").run(user.id, reqId);
        
        db.prepare(`INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'Maintenance Rejected', ?, 'MAINTENANCE_REJECTED', '/dashboard/maintenance')`).run(mReq.requested_by_employee_id, `Your maintenance request for ${mReq.assetName} has been rejected.`);
        
        return Response.json({ message: "Request rejected" });
    }

    if (action === "assign") {
        db.prepare("UPDATE maintenance_requests SET status = 'Assigned', assigned_technician = ?, updated_at = datetime('now') WHERE id = ?").run(assignedTechnician, reqId);
        return Response.json({ message: "Technician assigned" });
    }

    if (action === "start") {
        db.prepare("UPDATE maintenance_requests SET status = 'In Progress', updated_at = datetime('now') WHERE id = ?").run(reqId);
        return Response.json({ message: "Maintenance in progress" });
    }

    if (action === "resolve") {
        db.prepare("UPDATE maintenance_requests SET status = 'Resolved', resolution_notes = ?, updated_at = datetime('now') WHERE id = ?").run(resolutionNotes || null, reqId);
        db.prepare("UPDATE assets SET status = 'Available', updated_at = datetime('now') WHERE id = ?").run(mReq.asset_id);
        
        db.prepare(`INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'Maintenance Resolved', ?, 'MAINTENANCE_RESOLVED', '/dashboard/maintenance')`).run(mReq.requested_by_employee_id, `Maintenance for ${mReq.assetName} has been completed.`);
        
        return Response.json({ message: "Maintenance resolved" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
