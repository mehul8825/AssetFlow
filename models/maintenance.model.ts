import { getDb } from "@/lib/db";

export class MaintenanceModel {
  static getAll(filters?: { assetId?: number | null }) {
    const db = getDb();
    let query = `
      SELECT mr.id, mr.asset_id as assetId, mr.title, mr.description, mr.priority, mr.status,
             mr.assigned_technician as assignedTechnician, mr.resolution_notes as resolutionNotes,
             mr.created_at as createdAt, mr.updated_at as updatedAt,
             a.name as assetName, a.asset_tag as assetTag,
             re.name as requestedByName, ae.name as approvedByName
      FROM maintenance_requests mr
      JOIN assets a ON a.id = mr.asset_id
      JOIN employees re ON re.id = mr.requested_by_employee_id
      LEFT JOIN employees ae ON ae.id = mr.approved_by_employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.assetId) { query += " AND mr.asset_id = ?"; params.push(filters.assetId); }
    query += " ORDER BY mr.created_at DESC";

    return db.prepare(query).all(...params);
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare(
      `SELECT mr.*, a.name as assetName, a.asset_tag as assetTag 
       FROM maintenance_requests mr JOIN assets a ON a.id = mr.asset_id WHERE mr.id = ?`
    ).get(id) as any;
  }

  static create(data: { assetId: number; requestedByEmployeeId: number; title: string; description?: string; priority?: string }) {
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO maintenance_requests (asset_id, requested_by_employee_id, title, description, priority, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`
    ).run(data.assetId, data.requestedByEmployeeId, data.title, data.description || null, data.priority || 'Medium');
    
    return result.lastInsertRowid as number;
  }

  static updateStatus(id: number, status: string, data?: { approvedByEmployeeId?: number; assignedTechnician?: string; resolutionNotes?: string }) {
    const db = getDb();
    if (status === 'Approved' || status === 'Rejected') {
         db.prepare("UPDATE maintenance_requests SET status = ?, approved_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?").run(status, data?.approvedByEmployeeId, id);
    } else if (status === 'Assigned') {
         db.prepare("UPDATE maintenance_requests SET status = 'Assigned', assigned_technician = ?, updated_at = datetime('now') WHERE id = ?").run(data?.assignedTechnician, id);
    } else if (status === 'In Progress') {
         db.prepare("UPDATE maintenance_requests SET status = 'In Progress', updated_at = datetime('now') WHERE id = ?").run(id);
    } else if (status === 'Resolved') {
         db.prepare("UPDATE maintenance_requests SET status = 'Resolved', resolution_notes = ?, updated_at = datetime('now') WHERE id = ?").run(data?.resolutionNotes || null, id);
    }
  }
}
