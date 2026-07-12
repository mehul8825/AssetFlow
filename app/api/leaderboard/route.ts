import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    
    // Fetch all employees
    const employees = db.prepare("SELECT id, name, email, role FROM employees WHERE status = 'Active'").all() as any[];
    
    // Fetch all returned allocations with condition
    const allocations = db.prepare(`
      SELECT allocated_to_employee_id, return_condition 
      FROM asset_allocations 
      WHERE status = 'Returned' AND allocated_to_employee_id IS NOT NULL
    `).all() as any[];

    // Calculate points
    const pointsMap = new Map<number, number>();
    const returnedMap = new Map<number, number>();
    const damagedMap = new Map<number, number>();

    // Start everyone at base 100 points
    employees.forEach(emp => {
      pointsMap.set(emp.id, 100);
      returnedMap.set(emp.id, 0);
      damagedMap.set(emp.id, 0);
    });

    allocations.forEach(alloc => {
      const empId = alloc.allocated_to_employee_id;
      if (!pointsMap.has(empId)) return;

      let pts = pointsMap.get(empId)!;
      let returned = returnedMap.get(empId)! + 1;
      let damaged = damagedMap.get(empId)!;

      switch(alloc.return_condition) {
        case 'New':
        case 'Good':
          pts += 15;
          break;
        case 'Fair':
          pts += 5;
          break;
        case 'Poor':
          pts -= 15;
          damaged += 1;
          break;
        case 'Damaged':
          pts -= 30;
          damaged += 1;
          break;
      }
      
      pointsMap.set(empId, pts);
      returnedMap.set(empId, returned);
      damagedMap.set(empId, damaged);
    });

    // Determine badges based on points and damage
    const leaderboard = employees.map(emp => {
      const points = pointsMap.get(emp.id)!;
      const returned = returnedMap.get(emp.id)!;
      const damaged = damagedMap.get(emp.id)!;

      const badges = [];
      if (points >= 150) badges.push("Asset Guardian");
      if (returned >= 5 && damaged === 0) badges.push("Perfect Record");
      if (returned > 0 && points < 80) badges.push("Needs Improvement");
      if (returned === 0) badges.push("New Starter");

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        points,
        returned,
        badges,
      };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
