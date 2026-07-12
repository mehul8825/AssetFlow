import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { TransferModel } from "@/models/transfer.model";
import { AllocationModel } from "@/models/allocation.model";
import { NotificationModel } from "@/models/notification.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/transfers
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const transfers = TransferModel.getAll();
    return Response.json({ transfers });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/transfers
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, toEmployeeId, reason } = await request.json();

    if (!assetId || !toEmployeeId) {
        return Response.json({ error: "Asset and To Employee are required" }, { status: 400 });
    }

    const currentHolder = AllocationModel.getActiveAllocationHolder(assetId);
    if (!currentHolder) {
        return Response.json({ error: "Asset is not currently allocated to anyone, use direct allocation instead." }, { status: 400 });
    }

    const transferId = TransferModel.create({
        assetId, fromEmployeeId: currentHolder.allocated_to_employee_id, toEmployeeId, requestedByEmployeeId: user.id, reason
    });

    const managers = (await import("@/models/employee.model")).EmployeeModel.getManagers();
    for (const manager of managers) {
        NotificationModel.create(manager.id, 'New Transfer Request', `Transfer requested for asset ${assetId} from ${currentHolder.holderName} to employee ${toEmployeeId}`, 'TRANSFER_REQUEST', '/dashboard/allocations');
    }

    ActivityModel.log(user.id, 'TRANSFER_REQUEST', 'Asset', assetId, `Requested transfer from ${currentHolder.holderName} to ${toEmployeeId}`);

    return Response.json({ message: "Transfer request submitted", id: transferId }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
