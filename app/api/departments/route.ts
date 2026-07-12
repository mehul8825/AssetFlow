import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/departments
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const departments = db
      .prepare(
        `SELECT d.id, d.name, d.description, d.parent_department_id as parentDepartmentId,
                d.head_employee_id as headEmployeeId, d.status, d.created_at as createdAt,
                e.name as headName,
                pd.name as parentDepartmentName,
                (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id AND emp.status = 'Active') as employeeCount
         FROM departments d
         LEFT JOIN employees e ON e.id = d.head_employee_id
         LEFT JOIN departments pd ON pd.id = d.parent_department_id
         ORDER BY d.name ASC`
      )
      .all();

    return Response.json({ departments });
  } catch (error: any) {
    console.error("Get departments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/departments
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "Admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { name, description, parentDepartmentId, headEmployeeId } =
      await request.json();

    if (!name?.trim()) {
      return Response.json({ error: "Department name is required" }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate name
    const existing = db
      .prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?)")
      .get(name.trim());
    if (existing) {
      return Response.json({ error: "Department name already exists" }, { status: 409 });
    }

    const result = db
      .prepare(
        `INSERT INTO departments (name, description, parent_department_id, head_employee_id, status)
         VALUES (?, ?, ?, ?, 'Active')`
      )
      .run(name.trim(), description || null, parentDepartmentId || null, headEmployeeId || null);

    // If head is assigned, update that employee's role to Department Head
    if (headEmployeeId) {
      db.prepare(
        `UPDATE employees SET role = 'Department Head', department_id = ? WHERE id = ? AND role = 'Employee'`
      ).run(result.lastInsertRowid, headEmployeeId);
    }

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Department', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Created department: ${name.trim()}`);

    return Response.json(
      { message: "Department created", id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create department error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
