import { getDb } from "@/lib/db";

export class ActivityModel {
  static log(employeeId: number, action: string, entityType: string, entityId: number, details: string) {
    const db = getDb();
    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`
    ).run(employeeId, action, entityType, entityId, details);
  }
}
