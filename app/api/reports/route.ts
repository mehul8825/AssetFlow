import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/reports
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const db = getDb();

    // 1. Asset Status Distribution
    const statusDistribution = db.prepare(
        `SELECT status as name, COUNT(*) as value FROM assets GROUP BY status`
    ).all();

    // 2. Assets by Category
    const categoryDistribution = db.prepare(
        `SELECT c.name, COUNT(a.id) as value 
         FROM asset_categories c 
         LEFT JOIN assets a ON a.category_id = c.id 
         GROUP BY c.name 
         ORDER BY value DESC LIMIT 10`
    ).all();

    // 3. Assets by Department
    const departmentDistribution = db.prepare(
        `SELECT d.name, COUNT(a.id) as value 
         FROM departments d 
         LEFT JOIN assets a ON a.department_id = d.id 
         GROUP BY d.name 
         ORDER BY value DESC LIMIT 10`
    ).all();

    // 4. Value by Category
    const valueByCategory = db.prepare(
        `SELECT c.name, SUM(a.acquisition_cost) as totalValue 
         FROM asset_categories c 
         LEFT JOIN assets a ON a.category_id = c.id 
         GROUP BY c.name 
         ORDER BY totalValue DESC LIMIT 10`
    ).all();

    // 5. Total Asset Value
    const totalAssetValue = (db.prepare(`SELECT SUM(acquisition_cost) as total FROM assets`).get() as any)?.total || 0;

    // 6. Recent Activity (Last 30 days) - counts by day for charting
    const activityTrend = db.prepare(
        `SELECT date(created_at) as date, COUNT(*) as count 
         FROM activity_logs 
         WHERE created_at >= date('now', '-30 days') 
         GROUP BY date(created_at) 
         ORDER BY date(created_at) ASC`
    ).all();

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
