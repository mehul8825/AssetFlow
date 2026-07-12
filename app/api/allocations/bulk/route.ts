import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AllocationModel } from "@/models/allocation.model";
import { AssetModel } from "@/models/asset.model";
import { ActivityModel } from "@/models/activity.model";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Admin", "Asset Manager", "Department Head"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { allocations } = await req.json();
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const db = getDb();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Use a transaction for bulk operations
    const insertMany = db.transaction((allocs: any[]) => {
      for (const alloc of allocs) {
        const { assetTag, employeeEmail, expectedReturnDate } = alloc;
        
        if (!assetTag || !employeeEmail) {
            results.failed++;
            results.errors.push(`Missing fields for entry: ${JSON.stringify(alloc)}`);
            continue;
        }

        const asset = db.prepare("SELECT id, status, is_bookable FROM assets WHERE asset_tag = ?").get(assetTag) as any;
        if (!asset) {
            results.failed++;
            results.errors.push(`Asset not found: ${assetTag}`);
            continue;
        }
        
        if (asset.status !== "Available" || asset.is_bookable) {
            results.failed++;
            results.errors.push(`Asset ${assetTag} is not available for allocation`);
            continue;
        }

        const employee = db.prepare("SELECT id FROM employees WHERE email = ?").get(employeeEmail) as any;
        if (!employee) {
            results.failed++;
            results.errors.push(`Employee not found: ${employeeEmail}`);
            continue;
        }

        // Perform the allocation
        AllocationModel.create({
            assetId: asset.id,
            employeeId: employee.id,
            allocatedByEmployeeId: user.id,
            expectedReturnDate: expectedReturnDate || null
        });

        AssetModel.updateStatus(asset.id, "Allocated");
        ActivityModel.log(user.id, "ALLOCATE", "Asset", asset.id, `Bulk allocated ${assetTag} to ${employeeEmail}`);
        results.success++;
      }
    });

    insertMany(allocations);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Bulk allocation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
