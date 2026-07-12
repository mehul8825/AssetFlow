import { getDb } from "@/lib/db";

export class EmployeeModel {
  static getAll(filters?: { role?: string | null; departmentId?: number | null; status?: string | null }) {
    const db = getDb();
    let query = `
      SELECT e.id, e.name, e.email, e.role, e.department_id as departmentId,
             e.status, e.phone, e.created_at as createdAt,
             d.name as departmentName
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.role) {
      query += " AND e.role = ?";
      params.push(filters.role);
    }
    if (filters?.departmentId) {
      query += " AND e.department_id = ?";
      params.push(filters.departmentId);
    }
    if (filters?.status) {
      query += " AND e.status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY e.name ASC";

    return db.prepare(query).all(...params);
  }

  static getById(id: number) {
    const db = getDb();
    return db
      .prepare(
        `SELECT e.id, e.name, e.email, e.role, e.department_id as departmentId,
                e.status, e.phone, e.created_at as createdAt,
                d.name as departmentName
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.id = ?`
      )
      .get(id) as any;
  }

  static update(id: number, data: { role?: string | null; departmentId?: number | null; status?: string | null; phone?: string | null }) {
    const db = getDb();
    db.prepare(
      `UPDATE employees
       SET role = COALESCE(?, role),
           department_id = ?,
           status = COALESCE(?, status),
           phone = COALESCE(?, phone),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.role || null,
      data.departmentId !== undefined ? data.departmentId : null,
      data.status || null,
      data.phone || null,
      id
    );
  }

  static updateRoleAndDepartment(id: number, role: string, departmentId: number) {
      const db = getDb();
      db.prepare(
        `UPDATE employees SET role = ?, department_id = ? WHERE id = ?`
      ).run(role, departmentId, id);
  }

  static getManagers() {
      const db = getDb();
      return db.prepare("SELECT id FROM employees WHERE role = 'Asset Manager' AND status = 'Active'").all();
  }
}
