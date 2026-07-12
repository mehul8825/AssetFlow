import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AllocationModel } from "@/models/allocation.model";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";
import { NotificationModel } from "@/models/notification.model";

// PUT /api/allocations/[id] - Usually for returning an asset
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
    const allocationId = parseInt(id);
    const { action, returnCondition, returnNotes } = await request.json();

    const allocation = AllocationModel.getById(allocationId);
    if (!allocation || allocation.status !== 'Active') {
        return Response.json({ error: "Active allocation not found" }, { status: 404 });
    }

    if (action === 'return') {
        if (!returnCondition) return Response.json({ error: "Return condition is required" }, { status: 400 });
        
        const db = (await import("@/lib/db")).getDb();
        const tx = db.transaction(() => {
            AllocationModel.updateStatus(allocationId, 'Returned', returnCondition, returnNotes);
            AssetModel.updateStatus(allocation.asset_id, 'Available');
            ActivityModel.log(user.id, 'RETURN', 'Asset', allocation.asset_id, `Asset ${allocation.assetTag} returned. Condition: ${returnCondition}`);
        });

        try {
            tx();
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 500 });
        }

        if (returnCondition === 'Damaged' || returnCondition === 'Poor') {
            const managers = (await import("@/models/employee.model")).EmployeeModel.getManagers();
            for (const manager of managers) {
                NotificationModel.create(manager.id, 'Damaged Asset Returned', `Asset ${allocation.assetTag} was returned in ${returnCondition} condition.`, 'ASSET_DAMAGED', '/dashboard/assets');
            }
        }
    }

    return Response.json({ message: "Allocation updated successfully" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
