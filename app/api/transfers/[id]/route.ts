import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { TransferModel } from "@/models/transfer.model";
import { AllocationModel } from "@/models/allocation.model";
import { NotificationModel } from "@/models/notification.model";
import { ActivityModel } from "@/models/activity.model";

// PUT /api/transfers/[id] - Approve or Reject transfer
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
    const transferId = parseInt(id);
    const { action, rejectionReason } = await request.json();

    const transfer = TransferModel.getById(transferId);
    if (!transfer || transfer.status !== 'Requested') {
        return Response.json({ error: "Pending transfer request not found" }, { status: 404 });
    }

    const asset = (await import("@/models/asset.model")).AssetModel.getById(transfer.asset_id);
    if (!asset || ['Under Maintenance', 'Lost', 'Retired', 'Disposed'].includes(asset.status)) {
        return Response.json({ error: `Cannot process transfer. Asset status: ${asset?.status || 'Unknown'}` }, { status: 400 });
    }

    if (action === 'Approve') {
        const db = (await import("@/lib/db")).getDb();
        const tx = db.transaction(() => {
            TransferModel.updateStatus(transferId, 'Approved', user.id);
            AllocationModel.updateStatusByAssetId(transfer.asset_id, 'Transferred');
            AllocationModel.create({
                assetId: transfer.asset_id, employeeId: transfer.to_employee_id, allocatedByEmployeeId: user.id
            });
            TransferModel.updateStatus(transferId, 'Completed', user.id);
            ActivityModel.log(user.id, 'TRANSFER_APPROVE', 'Asset', transfer.asset_id, `Approved transfer of ${transfer.assetTag} to ${transfer.to_employee_id}`);
        });

        try {
            tx();
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 409 });
        }

        NotificationModel.create(transfer.requested_by_employee_id, 'Transfer Approved', `Your transfer request for ${transfer.assetTag} was approved.`, 'TRANSFER_APPROVED', '/dashboard/allocations');
        NotificationModel.create(transfer.to_employee_id, 'Asset Assigned', `You have been assigned asset: ${transfer.assetName} (${transfer.assetTag}) via transfer. The asset price will be deducted from your salary.`, 'ASSET_ASSIGNED', '/dashboard/assets');

    } else if (action === 'Reject') {
        TransferModel.updateStatus(transferId, 'Rejected', user.id, rejectionReason);
        NotificationModel.create(transfer.requested_by_employee_id, 'Transfer Rejected', `Your transfer request for ${transfer.assetTag} was rejected. Reason: ${rejectionReason}`, 'TRANSFER_REJECTED', '/dashboard/allocations');
        ActivityModel.log(user.id, 'TRANSFER_REJECT', 'Asset', transfer.asset_id, `Rejected transfer of ${transfer.assetTag}`);
    }

    return Response.json({ message: `Transfer request ${action.toLowerCase()}d` });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
