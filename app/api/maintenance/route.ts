import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/maintenance
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const assetId = request.nextUrl.searchParams.get("assetId");
    
    let query = `
      SELECT mr.id, mr.asset_id as assetId, mr.title, mr.description, mr.priority, mr.status,
             mr.assigned_technician as assignedTechnician, mr.resolution_notes as resolutionNotes,
             mr.created_at as createdAt, mr.updated_at as updatedAt,
             a.name as assetName, a.asset_tag as assetTag,
             re.name as requestedByName, ae.name as approvedByName
      FROM maintenance_requests mr
      JOIN assets a ON a.id = mr.asset_id
      JOIN employees re ON re.id = mr.requested_by_employee_id
      LEFT JOIN employees ae ON ae.id = mr.approved_by_employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (assetId) { query += " AND mr.asset_id = ?"; params.push(parseInt(assetId)); }
    query += " ORDER BY mr.created_at DESC";

    const maintenance = db.prepare(query).all(...params);
    return Response.json({ maintenance });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/maintenance
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, title, description, priority } = await request.json();
    if (!assetId || !title) return Response.json({ error: "Asset and title are required" }, { status: 400 });

    const db = getDb();

    // Check if asset exists
    const asset = db.prepare("SELECT id, name, asset_tag FROM assets WHERE id = ?").get(assetId) as any;
    if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });

    const result = db.prepare(
      `INSERT INTO maintenance_requests (asset_id, requested_by_employee_id, title, description, priority, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`
    ).run(assetId, user.id, title, description || null, priority || 'Medium');

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Maintenance', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Raised maintenance for ${asset.name} (${asset.asset_tag})`);

    // Notify Asset Managers
    const managers = db.prepare("SELECT id FROM employees WHERE role = 'Asset Manager' AND status = 'Active'").all() as any[];
    for (const manager of managers) {
        db.prepare(
          `INSERT INTO notifications (employee_id, title, message, type, link)
           VALUES (?, 'New Maintenance Request', ?, 'MAINTENANCE_REQUESTED', '/dashboard/maintenance')`
        ).run(manager.id, `New maintenance request for ${asset.name} (${asset.asset_tag}).`);
    }

    return Response.json({ message: "Maintenance request created", id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
