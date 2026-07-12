import { getCurrentUser } from "@/lib/auth";
import { type NextRequest } from "next/server";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";

// GET /api/assets/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const asset = AssetModel.getById(parseInt(id));
    if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });
    
    asset.customFields = asset.custom_fields ? JSON.parse(asset.custom_fields) : null;
    return Response.json({ asset });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/assets/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager"].includes(user.role))
        return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const assetId = parseInt(id);
    const data = await request.json();

    const existing = AssetModel.getById(assetId);
    if (!existing) return Response.json({ error: "Asset not found" }, { status: 404 });

    AssetModel.update(assetId, data);
    ActivityModel.log(user.id, 'UPDATE', 'Asset', assetId, `Updated asset details for ${existing.asset_tag}`);

    return Response.json({ message: "Asset updated" });
  } catch (error: any) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
