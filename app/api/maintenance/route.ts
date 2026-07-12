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

    const { assetId, title, description, priority } = await request.json();

    if (!assetId || !title) {
        return Response.json({ error: "Asset and Title are required" }, { status: 400 });
    }

    const reqId = MaintenanceModel.create({
        assetId, requestedByEmployeeId: user.id, title, description, priority
    });

    const managers = EmployeeModel.getManagers();
    for (const manager of managers) {
        NotificationModel.create(manager.id, 'New Maintenance Request', `A new ${priority || 'Medium'} priority request was raised for asset ${assetId}.`, 'MAINTENANCE_REQUEST', '/dashboard/maintenance');
    }

    ActivityModel.log(user.id, 'MAINTENANCE_REQUEST', 'Asset', assetId, `Requested maintenance: ${title}`);

    return Response.json({ message: "Maintenance request submitted", id: reqId }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
