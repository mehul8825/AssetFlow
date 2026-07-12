import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { differenceInMonths } from "date-fns";

export async function GET() {
  try {
    const db = getDb();
    
    const assets = db.prepare(`
      SELECT 
        a.id, a.name, a.asset_tag as assetTag, a.acquisition_date as acquisitionDate, a.status,
        a.photo_url as photoUrl, a.condition,
        c.name as categoryName,
        (SELECT COUNT(*) FROM asset_allocations aa WHERE aa.asset_id = a.id) as allocationCount,
        (SELECT COUNT(*) FROM maintenance_requests mr WHERE mr.asset_id = a.id) as maintenanceCount
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      WHERE a.status NOT IN ('Retired', 'Disposed')
    `).all();

    const scoredAssets = assets.map((asset: any) => {
      let ageInMonths = 0;
      if (asset.acquisitionDate) {
        try {
            ageInMonths = differenceInMonths(new Date(), new Date(asset.acquisitionDate));
            if (ageInMonths < 0) ageInMonths = 0;
        } catch(e) {}
      }

      const allocationPenalty = asset.allocationCount * 1;
      const maintenancePenalty = asset.maintenanceCount * 5;
      const agePenalty = ageInMonths * 0.5;

      let score = 100 - agePenalty - allocationPenalty - maintenancePenalty;
      score = Math.max(0, Math.min(100, Math.round(score)));

      let healthStatus = "Healthy";
      if (score < 50) healthStatus = "Critical";
      else if (score < 80) healthStatus = "Warning";

      return {
        ...asset,
        ageInMonths,
        healthScore: score,
        healthStatus,
        penalties: {
          age: agePenalty,
          allocations: allocationPenalty,
          maintenance: maintenancePenalty
        }
      };
    });

    // Sort by lowest score first
    scoredAssets.sort((a: any, b: any) => a.healthScore - b.healthScore);

    return NextResponse.json({ assets: scoredAssets });
  } catch (error: any) {
    console.error("Failed to fetch predictive health:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
