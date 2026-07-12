import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AuditModel } from "@/models/audit.model";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";
import { NotificationModel } from "@/models/notification.model";
import { getDb } from "@/lib/db";

// GET /api/audits
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const audits = AuditModel.getAllForUser(user.id, user.role);
    return Response.json({ audits });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/audits - Create Audit Cycle
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { name, scopeType, scopeValue, startDate, endDate, auditorIds } = await request.json();
    
    if (!name || !scopeType || !scopeValue || !startDate || !endDate || !auditorIds?.length) {
        return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const db = getDb();
    let cycleId: number = 0;
    
    db.exec('BEGIN TRANSACTION');
    try {
        cycleId = AuditModel.create({
            name, scopeType, scopeValue, startDate, endDate, createdByEmployeeId: user.id
        });

        for (const empId of auditorIds) {
            AuditModel.addAuditor(cycleId, empId);
            NotificationModel.create(empId, 'New Audit Assignment', `You have been assigned to audit cycle: ${name}`, 'AUDIT_ASSIGNED', '/dashboard/audits');
        }

        let assetsToAudit: any[] = [];
        if (scopeType === "Department") {
            assetsToAudit = AssetModel.getAssetsByDepartment(parseInt(scopeValue));
        } else if (scopeType === "Location") {
            assetsToAudit = AssetModel.getAssetsByLocation(scopeValue);
        }

        for (const asset of assetsToAudit) {
            AuditModel.addItem(cycleId, asset.id);
        }

        ActivityModel.log(user.id, 'CREATE', 'Audit', cycleId, `Created audit cycle: ${name} with ${assetsToAudit.length} items`);

        db.exec('COMMIT');
        return Response.json({ message: "Audit cycle created", id: cycleId }, { status: 201 });
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
