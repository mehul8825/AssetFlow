import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { EmployeeModel } from "@/models/employee.model";
import { ActivityModel } from "@/models/activity.model";

// PUT /api/employees/[id]
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
    const employeeId = parseInt(id);
    const { role, departmentId, status, phone } = await request.json();

    const existing = EmployeeModel.getById(employeeId);
    if (!existing) return Response.json({ error: "Employee not found" }, { status: 404 });

    EmployeeModel.update(employeeId, { role, departmentId, status, phone });
    ActivityModel.log(user.id, 'UPDATE', 'Employee', employeeId, `Updated employee ${existing.name} (Role: ${role}, Dept: ${departmentId})`);

    return Response.json({ message: "Employee updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
