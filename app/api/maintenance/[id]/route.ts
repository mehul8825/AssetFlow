import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { MaintenanceModel } from "@/models/maintenance.model";
import { ActivityModel } from "@/models/activity.model";
import { NotificationModel } from "@/models/notification.model";
import { AssetModel } from "@/models/asset.model";

// PUT /api/maintenance/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    // Role checks moved below after fetching request

    const { id } = await params;
    const reqId = parseInt(id);
    const { action, assignedTechnician, resolutionNotes, cost } = await request.json();

    const mReq = MaintenanceModel.getById(reqId);
    if (!mReq) return Response.json({ error: "Request not found" }, { status: 404 });

    const isManager = ["Admin", "Asset Manager"].includes(user.role);
    const isRequester = mReq.requested_by_employee_id === user.id;

    if (!isManager && !isRequester) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (['approve', 'reject'].includes(action) && !isManager) {
        return Response.json({ error: "Forbidden: Only managers can approve or reject" }, { status: 403 });
    }

    if (['assign', 'start', 'resolve'].includes(action) && !isRequester) {
        return Response.json({ error: "Forbidden: Only the requester can execute this request" }, { status: 403 });
    }

    if (action === 'approve') {
        MaintenanceModel.updateStatus(reqId, 'Approved', { approvedByEmployeeId: user.id });
        AssetModel.updateStatus(mReq.asset_id, 'Under Maintenance');
        NotificationModel.create(mReq.requested_by_employee_id, 'Maintenance Approved', `Your maintenance request "${mReq.title}" was approved.`, 'MAINTENANCE_UPDATE');
        ActivityModel.log(user.id, 'MAINTENANCE_APPROVE', 'Asset', mReq.asset_id, `Approved maintenance: ${mReq.title}`);
    } else if (action === 'reject') {
        MaintenanceModel.updateStatus(reqId, 'Rejected', { approvedByEmployeeId: user.id });
        NotificationModel.create(mReq.requested_by_employee_id, 'Maintenance Rejected', `Your maintenance request "${mReq.title}" was rejected.`, 'MAINTENANCE_UPDATE');
        ActivityModel.log(user.id, 'MAINTENANCE_REJECT', 'Asset', mReq.asset_id, `Rejected maintenance: ${mReq.title}`);
    } else if (action === 'assign') {
        MaintenanceModel.updateStatus(reqId, 'Assigned', { assignedTechnician });
    } else if (action === 'start') {
        MaintenanceModel.updateStatus(reqId, 'In Progress');
    } else if (action === 'resolve') {
        MaintenanceModel.updateStatus(reqId, 'Resolved', { resolutionNotes, cost });
        const activeHolder = (await import("@/models/allocation.model")).AllocationModel.getActiveAllocationHolder(mReq.asset_id);
        AssetModel.updateStatus(mReq.asset_id, activeHolder ? 'Allocated' : 'Available');
        
        // Notify managers that it's resolved
        const managers = (await import("@/models/employee.model")).EmployeeModel.getManagers();
        for (const manager of managers) {
            NotificationModel.create(manager.id, 'Maintenance Resolved', `Maintenance request "${mReq.title}" has been resolved by the requester.`, 'MAINTENANCE_UPDATE');
        }
        ActivityModel.log(user.id, 'MAINTENANCE_RESOLVE', 'Asset', mReq.asset_id, `Resolved maintenance: ${mReq.title}. Cost: $${cost}. Notes: ${resolutionNotes}`);
    } else {
         return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json({ message: `Maintenance ${action} successful` });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
