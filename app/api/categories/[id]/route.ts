import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

// PUT /api/categories/[id]
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
    const catId = parseInt(id);
    const { name, description, customFields, status } = await request.json();

    const db = getDb();

    const existing = db
      .prepare("SELECT id FROM asset_categories WHERE id = ?")
      .get(catId);
    if (!existing) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    if (name) {
      const dup = db
        .prepare(
          "SELECT id FROM asset_categories WHERE LOWER(name) = LOWER(?) AND id != ?"
        )
        .get(name.trim(), catId);
      if (dup) {
        return Response.json({ error: "Category name already exists" }, { status: 409 });
      }
    }

    db.prepare(
      `UPDATE asset_categories
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           custom_fields = COALESCE(?, custom_fields),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name?.trim() || null,
      description,
      customFields ? JSON.stringify(customFields) : null,
      status || null,
      catId
    );

    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, 'UPDATE', 'Category', ?, ?)`
    ).run(user.id, catId, `Updated category ID ${catId}`);

    return Response.json({ message: "Category updated" });
  } catch (error: any) {
    console.error("Update category error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
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
    const catId = parseInt(id);
    const db = getDb();

    const cat = db
      .prepare("SELECT id, status FROM asset_categories WHERE id = ?")
      .get(catId) as any;
    if (!cat) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    const newStatus = cat.status === "Active" ? "Inactive" : "Active";
    db.prepare(
      "UPDATE asset_categories SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newStatus, catId);

    return Response.json({
      message: `Category ${newStatus === "Active" ? "activated" : "deactivated"}`,
    });
  } catch (error: any) {
    console.error("Toggle category error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
