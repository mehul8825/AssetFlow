import { getCurrentUser } from "@/lib/auth";
import { EmployeeModel } from "@/models/employee.model";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const profile = EmployeeModel.getById(user.id);
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

    return Response.json({ profile });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
