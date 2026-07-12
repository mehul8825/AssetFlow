import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/assets/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const asset = db.prepare(
      `SELECT a.*, c.name as categoryName, d.name as departmentName
       FROM assets a
       LEFT JOIN asset_categories c ON c.id = a.category_id
       LEFT JOIN departments d ON d.id = a.department_id
       WHERE a.id = ?`
    ).get(parseInt(id)) as any;

    if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });

    // Get allocation history
    const allocations = db.prepare(
      `SELECT aa.*, e.name as employeeName, d.name as deptName, ab.name as allocatedByName
       FROM asset_allocations aa
       LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
       LEFT JOIN departments d ON d.id = aa.allocated_to_department_id
       LEFT JOIN employees ab ON ab.id = aa.allocated_by_employee_id
       WHERE aa.asset_id = ? ORDER BY aa.created_at DESC`
    ).all(parseInt(id));

    // Get maintenance history
    const maintenance = db.prepare(
      `SELECT mr.*, e.name as requestedByName
       FROM maintenance_requests mr
       LEFT JOIN employees e ON e.id = mr.requested_by_employee_id
       WHERE mr.asset_id = ? ORDER BY mr.created_at DESC`
    ).all(parseInt(id));

    return Response.json({
      asset: { ...asset, customFields: asset.custom_fields ? JSON.parse(asset.custom_fields) : null, isBookable: !!asset.is_bookable },
      allocations, maintenance,
    });
  } catch (error: any) {
    console.error("Get asset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/assets/[id]
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
    const assetId = parseInt(id);
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare("SELECT id FROM assets WHERE id = ?").get(assetId);
    if (!existing) return Response.json({ error: "Asset not found" }, { status: 404 });

    db.prepare(
      `UPDATE assets SET name = COALESCE(?, name), description = COALESCE(?, description),
       condition = COALESCE(?, condition), location = COALESCE(?, location),
       status = COALESCE(?, status), is_bookable = COALESCE(?, is_bookable),
       department_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      body.name || null, body.description, body.condition || null,
      body.location, body.status || null,
      body.isBookable !== undefined ? (body.isBookable ? 1 : 0) : null,
      body.departmentId !== undefined ? body.departmentId : null, assetId
    );

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'UPDATE', 'Asset', ?, ?)`
    ).run(user.id, assetId, `Updated asset ID ${assetId}`);

    return Response.json({ message: "Asset updated" });
  } catch (error: any) {
    console.error("Update asset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
