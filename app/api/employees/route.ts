import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { EmployeeModel } from "@/models/employee.model";

// GET /api/employees
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const departmentId = searchParams.get('departmentId') ? parseInt(searchParams.get('departmentId')!) : undefined;
    const status = searchParams.get('status');

    const employees = EmployeeModel.getAll({ role, departmentId, status });
    return Response.json({ employees });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
