import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AuditModel } from "@/models/audit.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/audits/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    const audit = AuditModel.getById(parseInt(id));
    if (!audit) return Response.json({ error: "Audit not found" }, { status: 404 });

    const auditors = AuditModel.getAuditors(audit.id);
    const items = AuditModel.getItems(audit.id);

    return Response.json({ audit, auditors, items });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/audits/[id] - Close audit cycle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    
    AuditModel.updateStatus(parseInt(id), 'Closed');
    ActivityModel.log(user.id, 'UPDATE', 'Audit', parseInt(id), 'Closed audit cycle');

    return Response.json({ message: "Audit cycle closed" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
