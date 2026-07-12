import { getDb } from "@/lib/db";

export class CategoryModel {
  static getAll() {
    const db = getDb();
    return db
      .prepare(
        `SELECT c.id, c.name, c.description, c.custom_fields as customFields,
                c.status, c.created_at as createdAt,
                (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id) as assetCount
         FROM asset_categories c
         ORDER BY c.name ASC`
      )
      .all()
      .map((c: any) => ({
        ...c,
        customFields: c.customFields ? JSON.parse(c.customFields) : [],
      }));
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare("SELECT id, status FROM asset_categories WHERE id = ?").get(id) as any;
  }

  static getByName(name: string, excludeId?: number) {
    const db = getDb();
    if (excludeId) {
        return db.prepare("SELECT id FROM asset_categories WHERE LOWER(name) = LOWER(?) AND id != ?").get(name.trim(), excludeId);
    }
    return db.prepare("SELECT id FROM asset_categories WHERE LOWER(name) = LOWER(?)").get(name.trim());
  }

  static create(data: { name: string; description?: string | null; customFields?: any }) {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO asset_categories (name, description, custom_fields, status)
         VALUES (?, ?, ?, 'Active')`
      )
      .run(
        data.name.trim(),
        data.description || null,
        data.customFields ? JSON.stringify(data.customFields) : null
      );
    return result.lastInsertRowid as number;
  }

  static update(id: number, data: { name?: string | null; description?: string | null; customFields?: any; status?: string | null }) {
    const db = getDb();
    db.prepare(
      `UPDATE asset_categories
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           custom_fields = COALESCE(?, custom_fields),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.name?.trim() || null,
      data.description,
      data.customFields ? JSON.stringify(data.customFields) : null,
      data.status || null,
      id
    );
  }

  static toggleStatus(id: number, newStatus: string) {
    const db = getDb();
    db.prepare("UPDATE asset_categories SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, id);
  }
}
