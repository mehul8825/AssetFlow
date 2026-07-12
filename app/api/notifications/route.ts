import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/notifications
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const notifications = db.prepare(
      `SELECT * FROM notifications WHERE employee_id = ? ORDER BY created_at DESC LIMIT 50`
    ).all(user.id);

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

    const db = getDb();
    const { id } = await request.json(); // if id provided, mark one. else mark all.

    if (id) {
         db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND employee_id = ?").run(id, user.id);
    } else {
        db.prepare("UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND is_read = 0").run(user.id);
    }

    return Response.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
