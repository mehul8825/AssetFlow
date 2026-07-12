import { getDb } from "@/lib/db";

export class ReportModel {
  static getStatusDistribution() {
    const db = getDb();
    return db.prepare(
        `SELECT status as name, COUNT(*) as value FROM assets GROUP BY status`
    ).all();
  }

  static getCategoryDistribution() {
    const db = getDb();
    return db.prepare(
        `SELECT c.name, COUNT(a.id) as value 
         FROM asset_categories c 
         LEFT JOIN assets a ON a.category_id = c.id 
         GROUP BY c.name 
         ORDER BY value DESC LIMIT 10`
    ).all();
  }

  static getDepartmentDistribution() {
    const db = getDb();
    return db.prepare(
        `SELECT d.name, COUNT(a.id) as value 
         FROM departments d 
         LEFT JOIN assets a ON a.department_id = d.id 
         GROUP BY d.name 
         ORDER BY value DESC LIMIT 10`
    ).all();
  }

  static getValueByCategory() {
    const db = getDb();
    return db.prepare(
        `SELECT c.name, SUM(a.acquisition_cost) as totalValue 
         FROM asset_categories c 
         LEFT JOIN assets a ON a.category_id = c.id 
         GROUP BY c.name 
         ORDER BY totalValue DESC LIMIT 10`
    ).all();
  }

  static getTotalAssetValue() {
    const db = getDb();
    return (db.prepare(`SELECT SUM(acquisition_cost) as total FROM assets`).get() as any)?.total || 0;
  }

  static getActivityTrend() {
    const db = getDb();
    return db.prepare(
        `SELECT date(created_at) as date, COUNT(*) as count 
         FROM activity_logs 
         WHERE created_at >= date('now', '-30 days') 
         GROUP BY date(created_at) 
         ORDER BY date(created_at) ASC`
    ).all();
  }
}
