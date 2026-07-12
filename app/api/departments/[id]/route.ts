import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { DepartmentModel } from "@/models/department.model";
import { EmployeeModel } from "@/models/employee.model";
import { ActivityModel } from "@/models/activity.model";

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
    const { name, description, parentDepartmentId, headEmployeeId, status } = await request.json();

    const existing = DepartmentModel.getById(deptId);
    if (!existing) return Response.json({ error: "Department not found" }, { status: 404 });

    if (name) {
      const dup = DepartmentModel.getByName(name, deptId);
      if (dup) return Response.json({ error: "Department name already exists" }, { status: 409 });
    }

    DepartmentModel.update(deptId, { name, description, parentDepartmentId, headEmployeeId, status });

    if (headEmployeeId) {
      EmployeeModel.updateRoleAndDepartment(headEmployeeId, 'Department Head', deptId);
    }

    ActivityModel.log(user.id, 'UPDATE', 'Department', deptId, `Updated department ID ${deptId}`);

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

    const dept = DepartmentModel.getById(deptId);
    if (!dept) return Response.json({ error: "Department not found" }, { status: 404 });

    const newStatus = dept.status === "Active" ? "Inactive" : "Active";
    DepartmentModel.toggleStatus(deptId, newStatus);

    ActivityModel.log(user.id, 'STATUS_CHANGE', 'Department', deptId, `Department ${deptId} status changed to ${newStatus}`);

    return Response.json({ message: `Department ${newStatus === "Active" ? "activated" : "deactivated"}` });
  } catch (error: any) {
    console.error("Toggle department error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
