import { getCurrentUser } from "@/lib/auth";
import { ReportModel } from "@/models/report.model";

// GET /api/reports
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const statusDistribution = ReportModel.getStatusDistribution();
    const categoryDistribution = ReportModel.getCategoryDistribution();
    const departmentDistribution = ReportModel.getDepartmentDistribution();
    const valueByCategory = ReportModel.getValueByCategory();
    const totalAssetValue = ReportModel.getTotalAssetValue();
    const activityTrend = ReportModel.getActivityTrend();

    return Response.json({ 
        statusDistribution, 
        categoryDistribution, 
        departmentDistribution, 
        valueByCategory,
        totalAssetValue,
        activityTrend
    });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
