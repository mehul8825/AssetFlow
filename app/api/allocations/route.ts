import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AllocationModel } from "@/models/allocation.model";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";
import { NotificationModel } from "@/models/notification.model";
import { EmployeeModel } from "@/models/employee.model";

// GET /api/allocations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get("assetId");

    let allocations;
    if (assetId) {
        allocations = AllocationModel.getByAssetId(parseInt(assetId));
    } else {
        allocations = AllocationModel.getAll();
    }
    
    return Response.json({ allocations });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/allocations
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { assetId, employeeId, departmentId, expectedReturnDate } = await request.json();

    if (!assetId || (!employeeId && !departmentId)) {
        return Response.json({ error: "Asset and Target (Employee or Department) are required" }, { status: 400 });
    }

    const asset = AssetModel.getById(assetId);
    if (!asset || asset.status !== 'Available') {
        return Response.json({ error: "Asset is not available for allocation" }, { status: 400 });
    }

    const allocationId = AllocationModel.create({
        assetId, employeeId, departmentId, allocatedByEmployeeId: user.id, expectedReturnDate
    });

    AssetModel.updateStatus(assetId, 'Allocated');

    ActivityModel.log(user.id, 'ALLOCATE', 'Asset', assetId, `Allocated ${asset.asset_tag} to ${employeeId ? 'Employee '+employeeId : 'Department '+departmentId}`);

    if (employeeId) {
        NotificationModel.create(employeeId, 'Asset Assigned', `You have been assigned asset: ${asset.name} (${asset.asset_tag})`, 'ASSET_ASSIGNED', '/dashboard/assets');
    }

    return Response.json({ message: "Asset allocated successfully" }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
