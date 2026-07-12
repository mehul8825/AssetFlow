import { getDb } from "@/lib/db";

export class DepartmentModel {
  static getAll() {
    const db = getDb();
    return db
      .prepare(
        `SELECT d.id, d.name, d.description, d.parent_department_id as parentDepartmentId,
                d.head_employee_id as headEmployeeId, d.status, d.created_at as createdAt,
                e.name as headName,
                pd.name as parentDepartmentName,
                (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id AND emp.status = 'Active') as employeeCount
         FROM departments d
         LEFT JOIN employees e ON e.id = d.head_employee_id
         LEFT JOIN departments pd ON pd.id = d.parent_department_id
         ORDER BY d.name ASC`
      )
      .all();
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare("SELECT id, name, status FROM departments WHERE id = ?").get(id) as any;
  }

  static getByName(name: string, excludeId?: number) {
    const db = getDb();
    if (excludeId) {
        return db.prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?").get(name.trim(), excludeId);
    }
    return db.prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?)").get(name.trim());
  }

  static create(data: { name: string; description?: string | null; parentDepartmentId?: number | null; headEmployeeId?: number | null }) {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO departments (name, description, parent_department_id, head_employee_id, status)
         VALUES (?, ?, ?, ?, 'Active')`
      )
      .run(data.name.trim(), data.description || null, data.parentDepartmentId || null, data.headEmployeeId || null);
    
    return result.lastInsertRowid as number;
  }

  static update(id: number, data: { name?: string | null; description?: string | null; parentDepartmentId?: number | null; headEmployeeId?: number | null; status?: string | null }) {
    const db = getDb();
    db.prepare(
      `UPDATE departments
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           parent_department_id = ?,
           head_employee_id = ?,
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.name?.trim() || null,
      data.description,
      data.parentDepartmentId || null,
      data.headEmployeeId || null,
      data.status || null,
      id
    );
  }

  static toggleStatus(id: number, newStatus: string) {
    const db = getDb();
    db.prepare("UPDATE departments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, id);
  }
}
