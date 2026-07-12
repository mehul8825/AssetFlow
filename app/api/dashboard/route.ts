import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

export async function GET() {
  try {
    seedDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // KPI counts
    const assetsAvailable = db
      .prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'Available'")
      .get() as any;
    const assetsAllocated = db
      .prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'Allocated'")
      .get() as any;
    const maintenanceToday = db
      .prepare(
        "SELECT COUNT(*) as count FROM maintenance_requests WHERE status IN ('Pending', 'Approved', 'Assigned', 'In Progress') AND date(created_at) = date('now')"
      )
      .get() as any;
    const activeBookings = db
      .prepare(
        "SELECT COUNT(*) as count FROM resource_bookings WHERE status IN ('Upcoming', 'Ongoing')"
      )
      .get() as any;
    const pendingTransfers = db
      .prepare(
        "SELECT COUNT(*) as count FROM transfer_requests WHERE status = 'Requested'"
      )
      .get() as any;

    // Overdue returns
    const overdueReturns = db
      .prepare(
        `SELECT aa.id, aa.expected_return_date as expectedReturnDate,
                a.name as assetName, a.asset_tag as assetTag,
                e.name as employeeName
         FROM asset_allocations aa
         JOIN assets a ON a.id = aa.asset_id
         LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
         WHERE aa.status = 'Active'
           AND aa.expected_return_date IS NOT NULL
           AND aa.expected_return_date < datetime('now')
         ORDER BY aa.expected_return_date ASC
         LIMIT 10`
      )
      .all();

    // Upcoming returns (not overdue)
    const upcomingReturns = db
      .prepare(
        `SELECT aa.id, aa.expected_return_date as expectedReturnDate,
                a.name as assetName, a.asset_tag as assetTag,
                e.name as employeeName
         FROM asset_allocations aa
         JOIN assets a ON a.id = aa.asset_id
         LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
         WHERE aa.status = 'Active'
           AND aa.expected_return_date IS NOT NULL
           AND aa.expected_return_date >= datetime('now')
         ORDER BY aa.expected_return_date ASC
         LIMIT 10`
      )
      .all();

    // Recent activity
    const recentActivity = db
      .prepare(
        `SELECT al.id, al.action, al.entity_type as entityType, al.details, al.created_at as createdAt,
                e.name as employeeName
         FROM activity_logs al
         LEFT JOIN employees e ON e.id = al.employee_id
         ORDER BY al.created_at DESC
         LIMIT 15`
      )
      .all();

    // Total assets
    const totalAssets = db
      .prepare("SELECT COUNT(*) as count FROM assets")
      .get() as any;

    // Maintenance pending
    const maintenancePending = db
      .prepare(
        "SELECT COUNT(*) as count FROM maintenance_requests WHERE status = 'Pending'"
      )
      .get() as any;

    return Response.json({
      kpis: {
        totalAssets: totalAssets.count,
        assetsAvailable: assetsAvailable.count,
        assetsAllocated: assetsAllocated.count,
        maintenanceToday: maintenanceToday.count,
        activeBookings: activeBookings.count,
        pendingTransfers: pendingTransfers.count,
        maintenancePending: maintenancePending.count,
      },
      overdueReturns,
      upcomingReturns,
      recentActivity,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
