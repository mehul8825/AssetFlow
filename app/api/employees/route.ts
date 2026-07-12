import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/employees
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    let query = `
      SELECT e.id, e.name, e.email, e.role, e.department_id as departmentId,
             e.status, e.phone, e.created_at as createdAt,
             d.name as departmentName
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      query += " AND e.role = ?";
      params.push(role);
    }
    if (departmentId) {
      query += " AND e.department_id = ?";
      params.push(parseInt(departmentId));
    }
    if (status) {
      query += " AND e.status = ?";
      params.push(status);
    }

    query += " ORDER BY e.name ASC";

    const employees = db.prepare(query).all(...params);

    return Response.json({ employees });
  } catch (error: any) {
    console.error("Get employees error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
