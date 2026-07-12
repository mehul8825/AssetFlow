import { getDb } from "@/lib/db";

export class NotificationModel {
  static create(employeeId: number, title: string, message: string, type: string, link?: string) {
    const db = getDb();
    db.prepare(
      `INSERT INTO notifications (employee_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`
    ).run(employeeId, title, message, type, link || null);
  }

  static getForUser(employeeId: number) {
      const db = getDb();
      return db.prepare(
        `SELECT * FROM notifications WHERE employee_id = ? ORDER BY created_at DESC LIMIT 50`
      ).all(employeeId);
  }

  static markAsRead(employeeId: number, id?: number) {
      const db = getDb();
      if (id) {
           db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND employee_id = ?").run(id, employeeId);
      } else {
          db.prepare("UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND is_read = 0").run(employeeId);
      }
  }
}
