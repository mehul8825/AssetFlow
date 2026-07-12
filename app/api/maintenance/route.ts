import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { MaintenanceModel } from "@/models/maintenance.model";
import { ActivityModel } from "@/models/activity.model";
import { NotificationModel } from "@/models/notification.model";
import { EmployeeModel } from "@/models/employee.model";

// GET /api/maintenance
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get("assetId");

    const maintenance = MaintenanceModel.getAll({ assetId: assetId ? parseInt(assetId) : null });

    return Response.json({ maintenance });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/maintenance
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, title, description, priority, quotations, assignedTechnician, assignedToEmployeeId } = await request.json();

    if (!assetId || !title) {
        return Response.json({ error: "Asset and Title are required" }, { status: 400 });
    }

    const isManager = ["Admin", "Asset Manager"].includes(user.role);

    if (!isManager) {
        if (!quotations || !Array.isArray(quotations) || quotations.length !== 3) {
            return Response.json({ error: "Exactly 3 tentative quotations are required" }, { status: 400 });
        }

        for (const q of quotations) {
            if (!q.vendorName || !q.amount) {
                return Response.json({ error: "Each quotation must have a vendor name and estimated amount" }, { status: 400 });
            }
        }
    }

    const reqId = MaintenanceModel.create({
        assetId, requestedByEmployeeId: user.id, title, description, priority, quotations: isManager ? undefined : JSON.stringify(quotations)
    });

    if (isManager) {
        MaintenanceModel.updateStatus(reqId, 'Assigned', { 
            assignedTechnician: assignedTechnician || null, 
            assignedToEmployeeId: assignedToEmployeeId ? parseInt(assignedToEmployeeId) : null
        });
        (await import("@/models/asset.model")).AssetModel.updateStatus(assetId, 'Under Maintenance');
        ActivityModel.log(user.id, 'MAINTENANCE_ASSIGN', 'Asset', assetId, `Requested and assigned maintenance: ${title}`);
    } else {
        const managers = EmployeeModel.getManagers();
        for (const manager of managers) {
            NotificationModel.create(manager.id, 'New Maintenance Request', `A new ${priority || 'Medium'} priority request was raised for asset ${assetId}.`, 'MAINTENANCE_REQUEST', '/dashboard/maintenance');
        }
        ActivityModel.log(user.id, 'MAINTENANCE_REQUEST', 'Asset', assetId, `Requested maintenance: ${title}`);
    }

    return Response.json({ message: "Maintenance request submitted", id: reqId }, { status: 201 });
  } catch (error: any) {
    console.error("Maintenance request error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
