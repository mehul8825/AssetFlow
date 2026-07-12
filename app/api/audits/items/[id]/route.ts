import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AuditModel } from "@/models/audit.model";
import { AssetModel } from "@/models/asset.model";
import { EmployeeModel } from "@/models/employee.model";
import { NotificationModel } from "@/models/notification.model";

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

    const item = AuditModel.getItemById(itemId);
    if (!item) return Response.json({ error: "Audit item not found" }, { status: 404 });

    const isAuditor = AuditModel.isAuditor(item.audit_cycle_id, user.id);
    if (!isAuditor && !["Admin", "Asset Manager"].includes(user.role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    AuditModel.updateItemStatus(itemId, status, user.id, notes);

    if (status === 'Missing' || status === 'Damaged') {
        if (status === 'Missing') {
             AssetModel.updateStatus(item.asset_id, 'Lost');
        }
        
        const managers = EmployeeModel.getManagers();
        for (const manager of managers) {
            NotificationModel.create(manager.id, 'Audit Discrepancy Found', `An asset was marked as ${status} during an audit.`, 'AUDIT_DISCREPANCY', '/dashboard/audits');
        }
    }

    return Response.json({ message: "Audit item updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
