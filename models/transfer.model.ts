import { getDb } from "@/lib/db";

export class TransferModel {
  static getAll() {
    const db = getDb();
    return db.prepare(
      `SELECT tr.id, tr.asset_id as assetId, tr.status, tr.reason, tr.rejection_reason as rejectionReason,
              tr.created_at as createdAt,
              a.name as assetName, a.asset_tag as assetTag,
              fe.name as fromEmployeeName, te.name as toEmployeeName,
              re.name as requestedByName, ae.name as approvedByName
       FROM transfer_requests tr
       JOIN assets a ON a.id = tr.asset_id
       LEFT JOIN employees fe ON fe.id = tr.from_employee_id
       JOIN employees te ON te.id = tr.to_employee_id
       JOIN employees re ON re.id = tr.requested_by_employee_id
       LEFT JOIN employees ae ON ae.id = tr.approved_by_employee_id
       ORDER BY tr.created_at DESC`
    ).all();
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare(
      `SELECT tr.*, a.name as assetName, a.asset_tag as assetTag
       FROM transfer_requests tr JOIN assets a ON a.id = tr.asset_id WHERE tr.id = ?`
    ).get(id) as any;
  }

  static create(data: { assetId: number; fromEmployeeId?: number; toEmployeeId: number; requestedByEmployeeId: number; reason?: string }) {
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO transfer_requests (asset_id, from_employee_id, to_employee_id, requested_by_employee_id, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Requested')`
    ).run(data.assetId, data.fromEmployeeId || null, data.toEmployeeId, data.requestedByEmployeeId, data.reason || null);
    
    return result.lastInsertRowid as number;
  }

  static updateStatus(id: number, status: string, approvedByEmployeeId: number, rejectionReason?: string) {
    const db = getDb();
    if (status === 'Approved') {
        db.prepare("UPDATE transfer_requests SET status = 'Approved', approved_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?")
          .run(approvedByEmployeeId, id);
    } else if (status === 'Rejected') {
        db.prepare("UPDATE transfer_requests SET status = 'Rejected', approved_by_employee_id = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?")
          .run(approvedByEmployeeId, rejectionReason || null, id);
    } else if (status === 'Completed') {
        db.prepare("UPDATE transfer_requests SET status = 'Completed', updated_at = datetime('now') WHERE id = ?").run(id);
    }
  }
}
