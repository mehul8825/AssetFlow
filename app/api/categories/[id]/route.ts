import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { CategoryModel } from "@/models/category.model";
import { ActivityModel } from "@/models/activity.model";

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

    const existing = CategoryModel.getById(catId);
    if (!existing) return Response.json({ error: "Category not found" }, { status: 404 });

    if (name) {
      const dup = CategoryModel.getByName(name, catId);
      if (dup) return Response.json({ error: "Category name already exists" }, { status: 409 });
    }

    CategoryModel.update(catId, { name, description, customFields, status });
    ActivityModel.log(user.id, 'UPDATE', 'Category', catId, `Updated category ID ${catId}`);

    return Response.json({ message: "Category updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/categories/[id] (soft delete via status toggle)
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

    const cat = CategoryModel.getById(catId);
    if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });

    const newStatus = cat.status === "Active" ? "Inactive" : "Active";
    CategoryModel.toggleStatus(catId, newStatus);
    ActivityModel.log(user.id, 'STATUS_CHANGE', 'Category', catId, `Category ${catId} status changed to ${newStatus}`);

    return Response.json({ message: `Category ${newStatus === "Active" ? "activated" : "deactivated"}` });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
