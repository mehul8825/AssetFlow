import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/audits
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    
    // Admins and Asset Managers see all. Auditors see cycles they are assigned to.
    let query = `
      SELECT ac.*, e.name as createdByName,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id) as totalItems,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id AND ai.status != 'Pending') as completedItems,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id AND ai.status IN ('Missing', 'Damaged')) as discrepancyCount
      FROM audit_cycles ac
      JOIN employees e ON e.id = ac.created_by_employee_id
    `;
    
    const params: any[] = [];
    if (!["Admin", "Asset Manager"].includes(user.role)) {
        query += ` JOIN audit_cycle_auditors aca ON aca.audit_cycle_id = ac.id WHERE aca.employee_id = ?`;
        params.push(user.id);
    }
    query += " ORDER BY ac.created_at DESC";

    const audits = db.prepare(query).all(...params);
    return Response.json({ audits });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/audits - Create Audit Cycle
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { name, scopeType, scopeValue, startDate, endDate, auditorIds } = await request.json();
    
    if (!name || !scopeType || !scopeValue || !startDate || !endDate || !auditorIds?.length) {
        return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const db = getDb();

    db.exec('BEGIN TRANSACTION');
    try {
        const result = db.prepare(
            `INSERT INTO audit_cycles (name, scope_type, scope_value, start_date, end_date, created_by_employee_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'Open')`
        ).run(name, scopeType, scopeValue, startDate, endDate, user.id);
        
        const cycleId = result.lastInsertRowid;

        // Add auditors
        const stmtAuditors = db.prepare(`INSERT INTO audit_cycle_auditors (audit_cycle_id, employee_id) VALUES (?, ?)`);
        for (const empId of auditorIds) {
            stmtAuditors.run(cycleId, empId);
            
            // Notify Auditor
            db.prepare(
                `INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, 'New Audit Assignment', ?, 'AUDIT_ASSIGNED', '/dashboard/audits')`
            ).run(empId, `You have been assigned to audit cycle: ${name}`);
        }

        // Generate Audit Items based on scope
        let assetsToAudit: any[] = [];
        if (scopeType === "Department") {
            assetsToAudit = db.prepare("SELECT id FROM assets WHERE department_id = ?").all(parseInt(scopeValue));
        } else if (scopeType === "Location") {
            assetsToAudit = db.prepare("SELECT id FROM assets WHERE location = ?").all(scopeValue);
        }

        const stmtItems = db.prepare(`INSERT INTO audit_items (audit_cycle_id, asset_id, status) VALUES (?, ?, 'Pending')`);
        for (const asset of assetsToAudit) {
            stmtItems.run(cycleId, asset.id);
        }

        db.prepare(
            `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
             VALUES (?, 'CREATE', 'Audit', ?, ?)`
        ).run(user.id, cycleId, `Created audit cycle: ${name} with ${assetsToAudit.length} items`);

        db.exec('COMMIT');
        return Response.json({ message: "Audit cycle created", id: cycleId }, { status: 201 });
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
