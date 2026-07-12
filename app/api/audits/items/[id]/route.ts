import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AuditModel } from "@/models/audit.model";
import { AssetModel } from "@/models/asset.model";
import { EmployeeModel } from "@/models/employee.model";
import { NotificationModel } from "@/models/notification.model";
import { MaintenanceModel } from "@/models/maintenance.model";
import { getDb } from "@/lib/db";

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
    
    const body = await request.json();
    const { action, status, notes, resolutionAction, resolutionNotes } = body;

    const item = AuditModel.getItemById(itemId);
    if (!item) return Response.json({ error: "Audit item not found" }, { status: 404 });

    // Handle Manager Discrepancy Resolution
    if (action === "resolve") {
      if (!["Admin", "Asset Manager"].includes(user.role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!resolutionAction || !['Confirm_Lost', 'Confirm_Damaged', 'Override_Verified'].includes(resolutionAction)) {
        return Response.json({ error: "Invalid resolution action" }, { status: 400 });
      }

      AuditModel.resolveDiscrepancy(itemId, resolutionAction, user.id, resolutionNotes);

      if (resolutionAction === "Confirm_Lost") {
        // Officially mark as Lost
        AssetModel.updateStatus(item.asset_id, 'Lost');
        // Terminate any active allocations
        const db = getDb();
        db.prepare(`
          UPDATE asset_allocations 
          SET status = 'Returned', 
              actual_return_date = datetime('now'), 
              return_condition = 'Lost', 
              return_notes = ?, 
              updated_at = datetime('now') 
          WHERE asset_id = ? AND status = 'Active'
        `).run(resolutionNotes || 'Confirmed lost during audit discrepancy resolution.', item.asset_id);
      } else if (resolutionAction === "Confirm_Damaged") {
        // Officially mark as Under Maintenance
        AssetModel.updateStatus(item.asset_id, 'Under Maintenance');
        // Automatically raise maintenance request
        const reqId = MaintenanceModel.create({
          assetId: item.asset_id,
          requestedByEmployeeId: user.id,
          title: `Audit Repair: ${item.assetName}`,
          description: `Raised automatically from Audit Discrepancy Resolution. Auditor notes: ${item.notes || 'None'}. Manager notes: ${resolutionNotes || 'None'}.`,
          priority: 'High'
        });
        // Pre-approve maintenance request since it was raised by manager/admin
        MaintenanceModel.updateStatus(reqId, 'Approved', { approvedByEmployeeId: user.id });
      }

      return Response.json({ message: "Discrepancy resolved successfully" });
    }

    // Handle regular Auditor actions
    const isAuditor = AuditModel.isAuditor(item.audit_cycle_id, user.id);
    if (!isAuditor && !["Admin", "Asset Manager"].includes(user.role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let targetStatus = status;
    if (status === 'Present') {
        targetStatus = 'Verified';
    }

    AuditModel.updateItemStatus(itemId, targetStatus, user.id, notes);

    if (targetStatus === 'Missing' || targetStatus === 'Damaged') {
        const managers = EmployeeModel.getManagers();
        for (const manager of managers) {
            NotificationModel.create(manager.id, 'Audit Discrepancy Found', `An asset was marked as ${targetStatus} during an audit.`, 'AUDIT_DISCREPANCY', '/dashboard/audits');
        }
    }

    return Response.json({ message: "Audit item updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
