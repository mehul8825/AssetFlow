import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// GET /api/categories
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.description, c.custom_fields as customFields,
                c.status, c.created_at as createdAt,
                (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id) as assetCount
         FROM asset_categories c
         ORDER BY c.name ASC`
      )
      .all()
      .map((c: any) => ({
        ...c,
        customFields: c.customFields ? JSON.parse(c.customFields) : [],
      }));

    return Response.json({ categories });
  } catch (error: any) {
    console.error("Get categories error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "Admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { name, description, customFields } = await request.json();

    if (!name?.trim()) {
      return Response.json({ error: "Category name is required" }, { status: 400 });
    }

    const db = getDb();

    const existing = db
      .prepare("SELECT id FROM asset_categories WHERE LOWER(name) = LOWER(?)")
      .get(name.trim());
    if (existing) {
      return Response.json({ error: "Category name already exists" }, { status: 409 });
    }

    const result = db
      .prepare(
        `INSERT INTO asset_categories (name, description, custom_fields, status)
         VALUES (?, ?, ?, 'Active')`
      )
      .run(
        name.trim(),
        description || null,
        customFields ? JSON.stringify(customFields) : null
      );

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'Category', ?, ?)`
    ).run(user.id, result.lastInsertRowid, `Created category: ${name.trim()}`);

    return Response.json(
      { message: "Category created", id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create category error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
