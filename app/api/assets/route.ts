import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/assets
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");
    const bookable = searchParams.get("bookable");

    const assets = AssetModel.getAll({ search, categoryId, status, departmentId, bookable });
    return Response.json({ assets });
  } catch (error: any) {
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

    const data = await request.json();
    if (!data.name || !data.categoryId) {
      return Response.json({ error: "Name and Category are required" }, { status: 400 });
    }

    const result = AssetModel.create(data);
    ActivityModel.log(user.id, 'CREATE', 'Asset', result.id, `Registered asset ${result.assetTag} - ${data.name}`);

    return Response.json({ message: "Asset registered", id: result.id, assetTag: result.assetTag }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
