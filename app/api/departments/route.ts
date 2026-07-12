import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { DepartmentModel } from "@/models/department.model";
import { EmployeeModel } from "@/models/employee.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/departments
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const departments = DepartmentModel.getAll();

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

    const { name, description, parentDepartmentId, headEmployeeId } = await request.json();

    if (!name?.trim()) {
      return Response.json({ error: "Department name is required" }, { status: 400 });
    }

    const existing = DepartmentModel.getByName(name);
    if (existing) {
      return Response.json({ error: "Department name already exists" }, { status: 409 });
    }

    const deptId = DepartmentModel.create({ name, description, parentDepartmentId, headEmployeeId });

    if (headEmployeeId) {
      EmployeeModel.updateRoleAndDepartment(headEmployeeId, 'Department Head', deptId);
    }

    ActivityModel.log(user.id, 'CREATE', 'Department', deptId, `Created department: ${name.trim()}`);

    return Response.json({ message: "Department created", id: deptId }, { status: 201 });
  } catch (error: any) {
    console.error("Create department error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
