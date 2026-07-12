import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/assets
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const sp = request.nextUrl.searchParams;
    const search = sp.get("search");
    const categoryId = sp.get("categoryId");
    const status = sp.get("status");
    const departmentId = sp.get("departmentId");
    const bookable = sp.get("bookable");

    let query = `
      SELECT a.id, a.name, a.asset_tag as assetTag, a.serial_number as serialNumber,
             a.category_id as categoryId, a.description, a.acquisition_date as acquisitionDate,
             a.acquisition_cost as acquisitionCost, a.condition, a.location, a.status,
             a.is_bookable as isBookable, a.photo_url as photoUrl, a.custom_fields as customFields,
             a.department_id as departmentId, a.created_at as createdAt,
             c.name as categoryName, d.name as departmentName
      FROM assets a
      LEFT JOIN asset_categories c ON c.id = a.category_id
      LEFT JOIN departments d ON d.id = a.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += " AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (categoryId) { query += " AND a.category_id = ?"; params.push(parseInt(categoryId)); }
    if (status) { query += " AND a.status = ?"; params.push(status); }
    if (departmentId) { query += " AND a.department_id = ?"; params.push(parseInt(departmentId)); }
    if (bookable === "true") { query += " AND a.is_bookable = 1"; }

    query += " ORDER BY a.created_at DESC";

    const assets = db.prepare(query).all(...params).map((a: any) => ({
      ...a,
      customFields: a.customFields ? JSON.parse(a.customFields) : null,
      isBookable: !!a.isBookable,
    }));

    return Response.json({ assets });
  } catch (error: any) {
    console.error("Get assets error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/assets
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, categoryId, serialNumber, description, acquisitionDate, acquisitionCost,
      condition, location, isBookable, customFields, departmentId } = body;

    if (!name?.trim() || !categoryId) {
      return Response.json({ error: "Name and category are required" }, { status: 400 });
    }

    const db = getDb();

    // Auto-generate asset tag
    const last = db.prepare("SELECT asset_tag FROM assets ORDER BY id DESC LIMIT 1").get() as any;
    let nextNum = 1;
    if (last?.asset_tag) {
      const match = last.asset_tag.match(/AF-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const assetTag = `AF-${String(nextNum).padStart(4, "0")}`;

    const result = db.prepare(
      `INSERT INTO assets (name, asset_tag, serial_number, category_id, description,
        acquisition_date, acquisition_cost, condition, location, status, is_bookable,
        custom_fields, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?)`
    ).run(
      name.trim(), assetTag, serialNumber || null, categoryId, description || null,
      acquisitionDate || null, acquisitionCost || null, condition || "Good",
      location || null, isBookable ? 1 : 0,
      customFields ? JSON.stringify(customFields) : null, departmentId || null
    );

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Asset', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Registered asset: ${name.trim()} (${assetTag})`);

    return Response.json({ message: "Asset registered", id: result.lastInsertRowid, assetTag }, { status: 201 });
  } catch (error: any) {
    console.error("Create asset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
