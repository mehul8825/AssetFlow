import { getDb } from "@/lib/db";

export class AllocationModel {
  static getAll() {
    const db = getDb();
    return db.prepare(
      `SELECT aa.id, aa.asset_id as assetId, aa.allocated_to_employee_id as allocatedToEmployeeId,
              aa.allocated_to_department_id as allocatedToDepartmentId,
              aa.allocated_by_employee_id as allocatedByEmployeeId,
              aa.allocation_date as allocationDate, aa.expected_return_date as expectedReturnDate,
              aa.actual_return_date as actualReturnDate, aa.return_condition as returnCondition,
              aa.return_notes as returnNotes, aa.status, aa.created_at as createdAt,
              a.name as assetName, a.asset_tag as assetTag,
              e.name as employeeName, d.name as departmentName,
              ab.name as allocatedByName
       FROM asset_allocations aa
       JOIN assets a ON a.id = aa.asset_id
       LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
       LEFT JOIN departments d ON d.id = aa.allocated_to_department_id
       LEFT JOIN employees ab ON ab.id = aa.allocated_by_employee_id
       ORDER BY aa.created_at DESC`
    ).all();
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare(
      `SELECT aa.*, a.name as assetName, a.asset_tag as assetTag
       FROM asset_allocations aa JOIN assets a ON a.id = aa.asset_id WHERE aa.id = ?`
    ).get(id) as any;
  }
  
  static getByAssetId(assetId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT aa.*, e.name as employeeName, d.name as deptName, ab.name as allocatedByName
         FROM asset_allocations aa
         LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
         LEFT JOIN departments d ON d.id = aa.allocated_to_department_id
         LEFT JOIN employees ab ON ab.id = aa.allocated_by_employee_id
         WHERE aa.asset_id = ? ORDER BY aa.created_at DESC`
      ).all(assetId);
  }

  static getActiveAllocationHolder(assetId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT e.name as holderName, aa.allocated_to_employee_id FROM asset_allocations aa
         LEFT JOIN employees e ON e.id = aa.allocated_to_employee_id
         WHERE aa.asset_id = ? AND aa.status = 'Active' LIMIT 1`
      ).get(assetId) as any;
  }

  static create(data: { assetId: number; employeeId?: number; departmentId?: number; allocatedByEmployeeId: number; expectedReturnDate?: string }) {
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO asset_allocations (asset_id, allocated_to_employee_id, allocated_to_department_id,
        allocated_by_employee_id, expected_return_date, status)
       VALUES (?, ?, ?, ?, ?, 'Active')`
    ).run(data.assetId, data.employeeId || null, data.departmentId || null, data.allocatedByEmployeeId, data.expectedReturnDate || null);
    
    return result.lastInsertRowid as number;
  }

  static updateStatus(id: number, status: string, returnCondition?: string, returnNotes?: string) {
    const db = getDb();
    if (status === 'Returned') {
        db.prepare(
          `UPDATE asset_allocations SET status = 'Returned', actual_return_date = datetime('now'),
           return_condition = ?, return_notes = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(returnCondition || null, returnNotes || null, id);
    } else {
        db.prepare("UPDATE asset_allocations SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    }
  }
  
  static updateStatusByAssetId(assetId: number, status: string) {
      const db = getDb();
      db.prepare("UPDATE asset_allocations SET status = ?, updated_at = datetime('now') WHERE asset_id = ? AND status = 'Active'")
          .run(status, assetId);
  }
}
