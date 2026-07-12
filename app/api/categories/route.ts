import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { CategoryModel } from "@/models/category.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/categories
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const categories = CategoryModel.getAll();
    return Response.json({ categories });
  } catch (error: any) {
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

    const existing = CategoryModel.getByName(name);
    if (existing) {
      return Response.json({ error: "Category name already exists" }, { status: 409 });
    }

    const catId = CategoryModel.create({ name, description, customFields });
    ActivityModel.log(user.id, 'CREATE', 'Category', catId, `Created asset category: ${name.trim()}`);

    return Response.json({ message: "Category created", id: catId }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
