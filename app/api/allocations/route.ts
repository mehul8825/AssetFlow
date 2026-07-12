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
    
    if (user.role === "Employee") {
      allocations = allocations.filter((a: any) => a.allocatedToEmployeeId === user.id);
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
    if (!asset || (asset.status !== 'Available' && asset.status !== 'Reserved')) {
        return Response.json({ error: "Asset is not available for allocation. Current status: " + (asset?.status || 'Unknown') }, { status: 400 });
    }

    if (employeeId) {
        const emp = EmployeeModel.getById(employeeId);
        if (!emp || emp.status !== 'Active') {
            return Response.json({ error: "Cannot allocate to an inactive or non-existent employee." }, { status: 400 });
        }
    }

    if (departmentId) {
        const dept = (await import("@/models/department.model")).DepartmentModel.getById(departmentId);
        if (!dept || dept.status !== 'Active') {
             return Response.json({ error: "Cannot allocate to an inactive or non-existent department." }, { status: 400 });
        }
    }

    const activeHolder = AllocationModel.getActiveAllocationHolder(assetId);
    if (activeHolder) {
        return Response.json({ error: `Conflict: Asset is already allocated to ${activeHolder.holderName}` }, { status: 409 });
    }

    const db = (await import("@/lib/db")).getDb();
    const tx = db.transaction(() => {
        const activeCheck = AllocationModel.getActiveAllocationHolder(assetId);
        if (activeCheck) throw new Error(`Conflict: Asset is already allocated to ${activeCheck.holderName}`);

        const allocationId = AllocationModel.create({
            assetId, employeeId, departmentId, allocatedByEmployeeId: user.id, expectedReturnDate
        });

        AssetModel.updateStatus(assetId, 'Allocated');
        ActivityModel.log(user.id, 'ALLOCATE', 'Asset', assetId, `Allocated ${asset.asset_tag} to ${employeeId ? 'Employee '+employeeId : 'Department '+departmentId}`);

        if (employeeId) {
            NotificationModel.create(employeeId, 'Asset Assigned', `You have been assigned asset: ${asset.name} (${asset.asset_tag}). The asset price will be deducted from your salary.`, 'ASSET_ASSIGNED', '/dashboard/assets');
        }
        return allocationId;
    });

    try {
        tx();
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 409 });
    }

    return Response.json({ message: "Asset allocated successfully" }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
