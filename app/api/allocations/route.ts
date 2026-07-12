import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/allocations
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const allocations = db.prepare(
      `SELECT aa.id, aa.asset_id as assetId, aa.allocated_to_employee_id as allocatedToEmployeeId,
              aa.allocated_to_department_id as allocatedToDepartmentId,
              aa.allocated_by_employee_id as allocatedByEmployeeId,
              aa.allocation_date as allocationDate, aa.expected_return_date as expectedReturnDate,
              aa.actual_return_date as actualReturnDate, aa.return_condition as returnCondition,
              aa.return_notes as returnNotes, aa.status, aa.created_at as createdAt,
              a.name as assetName, a.asset_tag as assetTag,
              e.name as employeeName, d.name as departmentName,
              ab.name as allocatedByName
       FROM asset_allocations aa
       JOIN assets a ON a.id = aa.asset_id
       LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
       LEFT JOIN departments d ON d.id = aa.allocated_to_department_id
       LEFT JOIN employees ab ON ab.id = aa.allocated_by_employee_id
       ORDER BY aa.created_at DESC`
    ).all();

    return Response.json({ allocations });
  } catch (error: any) {
    console.error("Get allocations error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/allocations - Allocate asset
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role))
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { assetId, employeeId, departmentId, expectedReturnDate } = await request.json();
    if (!assetId) return Response.json({ error: "Asset is required" }, { status: 400 });
    if (!employeeId && !departmentId)
      return Response.json({ error: "Employee or department is required" }, { status: 400 });

    const db = getDb();

    // Check asset status - must be Available
    const asset = db.prepare("SELECT id, name, asset_tag, status FROM assets WHERE id = ?").get(assetId) as any;
    if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });

    if (asset.status !== "Available") {
      // Find who holds it
      const currentAlloc = db.prepare(
        `SELECT e.name as holderName FROM asset_allocations aa
         LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
         WHERE aa.asset_id = ? AND aa.status = 'Active' LIMIT 1`
      ).get(assetId) as any;

      return Response.json({
        error: `Asset is currently ${asset.status}${currentAlloc?.holderName ? ` — held by ${currentAlloc.holderName}` : ""}. Use Transfer Request instead.`,
        currentHolder: currentAlloc?.holderName || null,
        suggestTransfer: true,
      }, { status: 409 });
    }

    const result = db.prepare(
      `INSERT INTO asset_allocations (asset_id, allocated_to_employee_id, allocated_to_department_id,
        allocated_by_employee_id, expected_return_date, status)
       VALUES (?, ?, ?, ?, ?, 'Active')`
    ).run(assetId, employeeId || null, departmentId || null, user.id, expectedReturnDate || null);

    // Update asset status
    db.prepare("UPDATE assets SET status = 'Allocated', updated_at = datetime('now') WHERE id = ?").run(assetId);

    // Log & notify
    const recipientName = employeeId
      ? (db.prepare("SELECT name FROM employees WHERE id = ?").get(employeeId) as any)?.name
      : (db.prepare("SELECT name FROM departments WHERE id = ?").get(departmentId) as any)?.name;

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'ALLOCATE', 'Asset', ?, ?)`
    ).run(user.id, assetId, `Allocated ${asset.name} (${asset.asset_tag}) to ${recipientName}`);

    if (employeeId) {
      db.prepare(
        `INSERT INTO notifications (employee_id, title, message, type, link)
         VALUES (?, 'Asset Assigned', ?, 'ASSET_ASSIGNED', '/dashboard/allocations')`
      ).run(employeeId, `${asset.name} (${asset.asset_tag}) has been assigned to you.`);
    }

    return Response.json({ message: "Asset allocated", id: result.lastInsertRowid }, { status: 201 });
  } catch (error: any) {
    console.error("Allocate error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
