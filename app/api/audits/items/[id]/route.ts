import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/audits/items/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const itemId = parseInt(id);
    const { status, notes } = await request.json();

    const db = getDb();
    
    // Check if user is an auditor for this cycle or admin
    const item = db.prepare(
        `SELECT ai.audit_cycle_id, ai.asset_id FROM audit_items ai WHERE ai.id = ?`
    ).get(itemId) as any;
    
    if (!item) return Response.json({ error: "Audit item not found" }, { status: 404 });

    const isAuditor = db.prepare(`SELECT 1 FROM audit_cycle_auditors WHERE audit_cycle_id = ? AND employee_id = ?`).get(item.audit_cycle_id, user.id);
    if (!isAuditor && !["Admin", "Asset Manager"].includes(user.role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    db.prepare(
        `UPDATE audit_items SET status = ?, notes = ?, audited_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, notes || null, user.id, itemId);

    // If marked Missing or Damaged, update asset status and notify
    if (status === 'Missing' || status === 'Damaged') {
        const newAssetStatus = status === 'Missing' ? 'Lost' : 'Available'; // Or maybe 'Under Maintenance' for Damaged, but let's stick to status updates. Let's just do Lost for missing.
        if (status === 'Missing') {
             db.prepare("UPDATE assets SET status = 'Lost', updated_at = datetime('now') WHERE id = ?").run(item.asset_id);
        }
        
        // Notify Managers
        const managers = db.prepare("SELECT id FROM employees WHERE role = 'Asset Manager' AND status = 'Active'").all() as any[];
        for (const manager of managers) {
            db.prepare(
              `INSERT INTO notifications (employee_id, title, message, type, link)
               VALUES (?, 'Audit Discrepancy Found', ?, 'AUDIT_DISCREPANCY', '/dashboard/audits')`
            ).run(manager.id, `An asset was marked as ${status} during an audit.`);
        }
    }

    return Response.json({ message: "Audit item updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
