import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/audits/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const audit = db.prepare(
      `SELECT ac.*, e.name as createdByName
       FROM audit_cycles ac
       JOIN employees e ON e.id = ac.created_by_employee_id
       WHERE ac.id = ?`
    ).get(parseInt(id)) as any;
    
    if (!audit) return Response.json({ error: "Audit not found" }, { status: 404 });

    const auditors = db.prepare(
        `SELECT e.id, e.name FROM audit_cycle_auditors aca JOIN employees e ON e.id = aca.employee_id WHERE aca.audit_cycle_id = ?`
    ).all(audit.id);

    const items = db.prepare(
        `SELECT ai.*, a.name as assetName, a.asset_tag as assetTag, a.location, a.status as assetStatus,
                e.name as auditedByName
         FROM audit_items ai
         JOIN assets a ON a.id = ai.asset_id
         LEFT JOIN employees e ON e.id = ai.audited_by_employee_id
         WHERE ai.audit_cycle_id = ?`
    ).all(audit.id);

    return Response.json({ audit, auditors, items });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/audits/[id] - Close audit cycle
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
    const db = getDb();

    db.prepare("UPDATE audit_cycles SET status = 'Closed', updated_at = datetime('now') WHERE id = ?").run(parseInt(id));
    
    db.prepare(
        `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
         VALUES (?, 'UPDATE', 'Audit', ?, 'Closed audit cycle')`
    ).run(user.id, parseInt(id));

    return Response.json({ message: "Audit cycle closed" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
