import { getDb } from "@/lib/db";

export class AssetModel {
  static getAll(filters?: { search?: string | null; categoryId?: string | null; status?: string | null; departmentId?: string | null; bookable?: string | null }) {
    const db = getDb();
    let query = `
      SELECT a.id, a.name, a.asset_tag as assetTag, a.serial_number as serialNumber,
             a.category_id as categoryId, a.description, a.acquisition_date as acquisitionDate,
             a.acquisition_cost as acquisitionCost, a.condition, a.location, a.status,
             a.is_bookable as isBookable, a.photo_url as photoUrl, a.custom_fields as customFields,
             a.department_id as departmentId, a.created_at as createdAt,
             c.name as categoryName, d.name as departmentName
      FROM assets a
      LEFT JOIN asset_categories c ON c.id = a.category_id
      LEFT JOIN departments d ON d.id = a.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.search) {
      query += " AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters?.categoryId) { query += " AND a.category_id = ?"; params.push(parseInt(filters.categoryId)); }
    if (filters?.status) { query += " AND a.status = ?"; params.push(filters.status); }
    if (filters?.departmentId) { query += " AND a.department_id = ?"; params.push(parseInt(filters.departmentId)); }
    if (filters?.bookable === "true") { query += " AND a.is_bookable = 1"; }

    query += " ORDER BY a.created_at DESC";

    return db.prepare(query).all(...params).map((a: any) => ({
      ...a,
      customFields: a.customFields ? JSON.parse(a.customFields) : null,
      isBookable: !!a.isBookable,
    }));
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare(
      `SELECT a.*, c.name as categoryName, d.name as departmentName
       FROM assets a
       LEFT JOIN asset_categories c ON c.id = a.category_id
       LEFT JOIN departments d ON d.id = a.department_id
       WHERE a.id = ?`
    ).get(id) as any;
  }

  static create(data: { name: string; categoryId: number; serialNumber?: string; description?: string; acquisitionDate?: string; acquisitionCost?: number; condition?: string; location?: string; isBookable?: boolean; customFields?: any; departmentId?: number }) {
    const db = getDb();
    // Auto-generate asset tag
    const last = db.prepare("SELECT asset_tag FROM assets ORDER BY id DESC LIMIT 1").get() as any;
    let nextNum = 1;
    if (last?.asset_tag) {
      const match = last.asset_tag.match(/AF-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const assetTag = `AF-${String(nextNum).padStart(4, "0")}`;

    const result = db.prepare(
      `INSERT INTO assets (name, asset_tag, serial_number, category_id, description,
        acquisition_date, acquisition_cost, condition, location, status, is_bookable,
        custom_fields, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?)`
    ).run(
      data.name.trim(), assetTag, data.serialNumber || null, data.categoryId, data.description || null,
      data.acquisitionDate || null, data.acquisitionCost || null, data.condition || "Good",
      data.location || null, data.isBookable ? 1 : 0,
      data.customFields ? JSON.stringify(data.customFields) : null, data.departmentId || null
    );

    return { id: result.lastInsertRowid as number, assetTag };
  }

  static update(id: number, data: { name?: string | null; description?: string | null; condition?: string | null; location?: string | null; status?: string | null; isBookable?: boolean | null; departmentId?: number | null }) {
    const db = getDb();
    db.prepare(
      `UPDATE assets SET name = COALESCE(?, name), description = COALESCE(?, description),
       condition = COALESCE(?, condition), location = COALESCE(?, location),
       status = COALESCE(?, status), is_bookable = COALESCE(?, is_bookable),
       department_id = COALESCE(?, department_id), updated_at = datetime('now') WHERE id = ?`
    ).run(
      data.name || null, data.description, data.condition || null,
      data.location, data.status || null,
      data.isBookable !== undefined && data.isBookable !== null ? (data.isBookable ? 1 : 0) : null,
      data.departmentId !== undefined ? data.departmentId : null, id
    );
  }

  static updateStatus(id: number, status: string) {
      const db = getDb();
      db.prepare("UPDATE assets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  static getAssetsByDepartment(departmentId: number) {
      const db = getDb();
      return db.prepare("SELECT id FROM assets WHERE department_id = ?").all(departmentId);
  }
  
  static getAssetsByLocation(location: string) {
      const db = getDb();
      return db.prepare("SELECT id FROM assets WHERE location = ?").all(location);
  }
}
