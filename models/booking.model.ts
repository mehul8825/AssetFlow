import { getDb } from "@/lib/db";

export class BookingModel {
  static getAll(filters?: { assetId?: number | null }) {
    const db = getDb();
    let query = `
      SELECT rb.id, rb.asset_id as assetId, rb.booked_by_employee_id as bookedByEmployeeId,
             rb.title, rb.description, rb.start_time as startTime, rb.end_time as endTime,
             rb.status, rb.created_at as createdAt,
             a.name as assetName, a.asset_tag as assetTag, a.location,
             e.name as bookedByName
      FROM resource_bookings rb
      JOIN assets a ON a.id = rb.asset_id
      JOIN employees e ON e.id = rb.booked_by_employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.assetId) { query += " AND rb.asset_id = ?"; params.push(filters.assetId); }
    query += " ORDER BY rb.start_time ASC";

    return db.prepare(query).all(...params);
  }

  static getById(id: number) {
    const db = getDb();
    return db.prepare("SELECT * FROM resource_bookings WHERE id = ?").get(id) as any;
  }

  static checkOverlap(assetId: number, startTime: string, endTime: string, excludeBookingId?: number) {
      const db = getDb();
      let query = `SELECT id, title, start_time, end_time FROM resource_bookings
                   WHERE asset_id = ? AND status IN ('Upcoming', 'Ongoing')
                   AND start_time < ? AND end_time > ?`;
      const params = [assetId, endTime, startTime];
      if (excludeBookingId) {
          query += " AND id != ?";
          params.push(excludeBookingId);
      }
      return db.prepare(query).get(...params) as any;
  }

  static create(data: { assetId: number; bookedByEmployeeId: number; title: string; description?: string; startTime: string; endTime: string }) {
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO resource_bookings (asset_id, booked_by_employee_id, title, description, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Upcoming')`
    ).run(data.assetId, data.bookedByEmployeeId, data.title, data.description || null, data.startTime, data.endTime);
    
    return result.lastInsertRowid as number;
  }

  static update(id: number, data: { title: string; description?: string; startTime: string; endTime: string }) {
      const db = getDb();
      db.prepare(
          `UPDATE resource_bookings SET title = ?, description = ?, start_time = ?, end_time = ?, updated_at = datetime('now')
           WHERE id = ?`
      ).run(data.title, data.description || null, data.startTime, data.endTime, id);
  }

  static updateStatus(id: number, status: string) {
    const db = getDb();
    db.prepare("UPDATE resource_bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }
}
