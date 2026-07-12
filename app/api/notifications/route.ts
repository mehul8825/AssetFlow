import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { NotificationModel } from "@/models/notification.model";

// GET /api/notifications
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = NotificationModel.getForUser(user.id);
    return Response.json({ notifications });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/notifications - Mark all as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json(); 
    NotificationModel.markAsRead(user.id, id);

    return Response.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
