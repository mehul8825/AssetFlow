import { getDb } from "@/lib/db";

export class AuditModel {
  static getAllForUser(userId: number, role: string) {
    const db = getDb();
    let query = `
      SELECT ac.*, e.name as createdByName,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id) as totalItems,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id AND ai.status != 'Pending') as completedItems,
             (SELECT COUNT(*) FROM audit_items ai WHERE ai.audit_cycle_id = ac.id AND ai.status IN ('Missing', 'Damaged')) as discrepancyCount
      FROM audit_cycles ac
      JOIN employees e ON e.id = ac.created_by_employee_id
    `;
    
    const params: any[] = [];
    if (!["Admin", "Asset Manager"].includes(role)) {
        query += ` JOIN audit_cycle_auditors aca ON aca.audit_cycle_id = ac.id WHERE aca.employee_id = ?`;
        params.push(userId);
    }
    query += " ORDER BY ac.created_at DESC";

    return db.prepare(query).all(...params);
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare(
      `SELECT ac.*, e.name as createdByName
       FROM audit_cycles ac
       JOIN employees e ON e.id = ac.created_by_employee_id
       WHERE ac.id = ?`
    ).get(id) as any;
  }

  static getAuditors(auditId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT e.id, e.name FROM audit_cycle_auditors aca JOIN employees e ON e.id = aca.employee_id WHERE aca.audit_cycle_id = ?`
      ).all(auditId);
  }

  static getItems(auditId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT ai.*, a.name as assetName, a.asset_tag as assetTag, a.location, a.status as assetStatus,
                e.name as auditedByName
         FROM audit_items ai
         JOIN assets a ON a.id = ai.asset_id
         LEFT JOIN employees e ON e.id = ai.audited_by_employee_id
         WHERE ai.audit_cycle_id = ?`
      ).all(auditId);
  }

  static getItemById(itemId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT ai.audit_cycle_id, ai.asset_id FROM audit_items ai WHERE ai.id = ?`
      ).get(itemId) as any;
  }

  static isAuditor(auditId: number, employeeId: number) {
      const db = getDb();
      const res = db.prepare(`SELECT 1 FROM audit_cycle_auditors WHERE audit_cycle_id = ? AND employee_id = ?`).get(auditId, employeeId);
      return !!res;
  }

  static create(data: { name: string; scopeType: string; scopeValue: string; startDate: string; endDate: string; createdByEmployeeId: number }) {
    const db = getDb();
    const result = db.prepare(
        `INSERT INTO audit_cycles (name, scope_type, scope_value, start_date, end_date, created_by_employee_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Open')`
    ).run(data.name, data.scopeType, data.scopeValue, data.startDate, data.endDate, data.createdByEmployeeId);
    
    return result.lastInsertRowid as number;
  }

  static addAuditor(auditId: number, employeeId: number) {
      const db = getDb();
      db.prepare(`INSERT INTO audit_cycle_auditors (audit_cycle_id, employee_id) VALUES (?, ?)`).run(auditId, employeeId);
  }

  static addItem(auditId: number, assetId: number) {
      const db = getDb();
      db.prepare(`INSERT INTO audit_items (audit_cycle_id, asset_id, status) VALUES (?, ?, 'Pending')`).run(auditId, assetId);
  }

  static updateStatus(id: number, status: string) {
      const db = getDb();
      db.prepare("UPDATE audit_cycles SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  static updateItemStatus(itemId: number, status: string, auditedByEmployeeId: number, notes?: string) {
      const db = getDb();
      db.prepare(
        `UPDATE audit_items SET status = ?, notes = ?, audited_by_employee_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(status, notes || null, auditedByEmployeeId, itemId);
  }
}
