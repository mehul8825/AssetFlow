import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    
    const departments = db.prepare("SELECT id, name FROM departments").all() as any[];
    const employees = db.prepare("SELECT id, name, department_id, role FROM employees WHERE status = 'Active'").all() as any[];
    
    // Get all active allocations with asset details
    const allocations = db.prepare(`
      SELECT aa.allocated_to_employee_id as employeeId, a.id, a.name, a.asset_tag, a.category_id, c.name as categoryName
      FROM asset_allocations aa
      JOIN assets a ON a.id = aa.asset_id
      LEFT JOIN asset_categories c ON c.id = a.category_id
      WHERE aa.status = 'Active' AND aa.allocated_to_employee_id IS NOT NULL
    `).all() as any[];

    // Unassigned assets (not currently allocated)
    const unassignedAssets = db.prepare(`
      SELECT a.id, a.name, a.asset_tag, a.category_id, c.name as categoryName
      FROM assets a
      LEFT JOIN asset_categories c ON c.id = a.category_id
      WHERE a.status = 'Available'
    `).all() as any[];

    // Build the hierarchy
    const networkData = departments.map(dept => {
      const deptEmployees = employees.filter(e => e.department_id === dept.id).map(emp => {
        const empAssets = allocations.filter(a => a.employeeId === emp.id).map(a => ({
          id: a.id,
          name: a.name,
          tag: a.asset_tag,
          category: a.categoryName || "Uncategorized"
        }));
        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          assets: empAssets
        };
      });

      return {
        id: dept.id,
        name: dept.name,
        employees: deptEmployees
      };
    });

    // Handle employees without a department
    const noDeptEmployees = employees.filter(e => !e.department_id).map(emp => {
      const empAssets = allocations.filter(a => a.employeeId === emp.id).map(a => ({
        id: a.id,
        name: a.name,
        tag: a.asset_tag,
        category: a.categoryName || "Uncategorized"
      }));
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        assets: empAssets
      };
    });

    if (noDeptEmployees.length > 0) {
      networkData.push({
        id: 999999,
        name: "No Department",
        employees: noDeptEmployees
      });
    }

    return NextResponse.json({ 
      network: networkData,
      unassigned: unassignedAssets.map(a => ({
        id: a.id,
        name: a.name,
        tag: a.asset_tag,
        category: a.categoryName || "Uncategorized"
      }))
    });
  } catch (error) {
    console.error("Network API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
