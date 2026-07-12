import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/employees/[id] - Update employee (Admin: role promotion, dept assignment)
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
    const empId = parseInt(id);
    const { role, departmentId, status, phone } = await request.json();

    const db = getDb();

    const existing = db
      .prepare("SELECT id, name, role FROM employees WHERE id = ?")
      .get(empId) as any;
    if (!existing) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    // Cannot demote yourself as admin
    if (empId === user.id && role && role !== "Admin") {
      return Response.json({ error: "Cannot change your own admin role" }, { status: 400 });
    }

    const validRoles = ["Admin", "Asset Manager", "Department Head", "Employee"];
    if (role && !validRoles.includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    db.prepare(
      `UPDATE employees
       SET role = COALESCE(?, role),
           department_id = ?,
           status = COALESCE(?, status),
           phone = COALESCE(?, phone),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      role || null,
      departmentId !== undefined ? departmentId : null,
      status || null,
      phone || null,
      empId
    );

    // If role changed, log it
    const details = [];
    if (role && role !== existing.role)
      details.push(`Role: ${existing.role} → ${role}`);
    if (details.length > 0 || departmentId !== undefined) {
      db.prepare(
        `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
         VALUES (?, 'UPDATE', 'Employee', ?, ?)`
      ).run(
        user.id,
        empId,
        `Updated ${existing.name}: ${details.join(", ") || "profile updated"}`
      );

      // Notify the employee about role change
      if (role && role !== existing.role) {
        db.prepare(
          `INSERT INTO notifications (employee_id, title, message, type)
           VALUES (?, ?, ?, 'ROLE_CHANGE')`
        ).run(
          empId,
          "Role Updated",
          `Your role has been changed from ${existing.role} to ${role}.`
        );
      }
    }

    return Response.json({ message: "Employee updated" });
  } catch (error: any) {
    console.error("Update employee error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/employees/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const employee = db
      .prepare(
        `SELECT e.id, e.name, e.email, e.role, e.department_id as departmentId,
                e.status, e.phone, e.created_at as createdAt,
                d.name as departmentName
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.id = ?`
      )
      .get(parseInt(id));

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    return Response.json({ employee });
  } catch (error: any) {
    console.error("Get employee error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
