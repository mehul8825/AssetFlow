import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/departments/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "Admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deptId = parseInt(id);
    const { name, description, parentDepartmentId, headEmployeeId, status } =
      await request.json();

    const db = getDb();

    const existing = db.prepare("SELECT id FROM departments WHERE id = ?").get(deptId);
    if (!existing) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    // Check duplicate name (excluding self)
    if (name) {
      const dup = db
        .prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?")
        .get(name.trim(), deptId);
      if (dup) {
        return Response.json({ error: "Department name already exists" }, { status: 409 });
      }
    }

    db.prepare(
      `UPDATE departments
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           parent_department_id = ?,
           head_employee_id = ?,
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name?.trim() || null,
      description,
      parentDepartmentId || null,
      headEmployeeId || null,
      status || null,
      deptId
    );

    // If head changed, update employee role
    if (headEmployeeId) {
      db.prepare(
        `UPDATE employees SET role = 'Department Head', department_id = ? WHERE id = ? AND role = 'Employee'`
      ).run(deptId, headEmployeeId);
    }

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'UPDATE', 'Department', ?, ?)`
    ).run(user.id, deptId, `Updated department ID ${deptId}`);

    return Response.json({ message: "Department updated" });
  } catch (error: any) {
    console.error("Update department error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/departments/[id] (soft delete via status toggle)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "Admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deptId = parseInt(id);
    const db = getDb();

    const dept = db
      .prepare("SELECT id, status FROM departments WHERE id = ?")
      .get(deptId) as any;
    if (!dept) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    const newStatus = dept.status === "Active" ? "Inactive" : "Active";
    db.prepare("UPDATE departments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      newStatus,
      deptId
    );

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'STATUS_CHANGE', 'Department', ?, ?)`
    ).run(user.id, deptId, `Department ${deptId} status changed to ${newStatus}`);

    return Response.json({ message: `Department ${newStatus === "Active" ? "activated" : "deactivated"}` });
  } catch (error: any) {
    console.error("Toggle department error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
