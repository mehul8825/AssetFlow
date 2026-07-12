import { getDb } from "./db";
import bcryptjs from "bcryptjs";

export function seedDatabase() {
  const db = getDb();

  // Check if admin already exists
  const existingAdmin = db
    .prepare("SELECT id FROM employees WHERE role = 'Admin' LIMIT 1")
    .get();

  if (existingAdmin) {
    return; // Already seeded
  }

  const passwordHash = bcryptjs.hashSync("admin123", 10);

  // Create default admin
  db.prepare(
    `INSERT INTO employees (name, email, password_hash, role, status) VALUES (?, ?, ?, 'Admin', 'Active')`
  ).run("System Admin", "admin@assetflow.com", passwordHash);

  // Seed default departments
  const deptStmt = db.prepare(
    `INSERT INTO departments (name, description, status) VALUES (?, ?, 'Active')`
  );
  deptStmt.run("IT Department", "Information Technology and Systems");
  deptStmt.run("Human Resources", "HR and People Operations");
  deptStmt.run("Finance", "Financial Operations and Accounting");
  deptStmt.run("Operations", "Business Operations and Logistics");
  deptStmt.run("Marketing", "Marketing and Communications");

  // Seed default asset categories
  const catStmt = db.prepare(
    `INSERT INTO asset_categories (name, description, custom_fields, status) VALUES (?, ?, ?, 'Active')`
  );
  catStmt.run(
    "Electronics",
    "Electronic devices and equipment",
    JSON.stringify([
      { name: "warranty_period", label: "Warranty Period (months)", type: "number" },
      { name: "brand", label: "Brand", type: "text" },
    ])
  );
  catStmt.run(
    "Furniture",
    "Office furniture and fixtures",
    JSON.stringify([
      { name: "material", label: "Material", type: "text" },
      { name: "color", label: "Color", type: "text" },
    ])
  );
  catStmt.run(
    "Vehicles",
    "Company vehicles and transport",
    JSON.stringify([
      { name: "license_plate", label: "License Plate", type: "text" },
      { name: "mileage", label: "Current Mileage (km)", type: "number" },
    ])
  );
  catStmt.run(
    "Office Equipment",
    "Printers, scanners, and other office equipment",
    JSON.stringify([
      { name: "model_number", label: "Model Number", type: "text" },
    ])
  );
  catStmt.run(
    "Meeting Rooms",
    "Conference and meeting rooms",
    JSON.stringify([
      { name: "capacity", label: "Capacity (persons)", type: "number" },
      { name: "has_projector", label: "Has Projector", type: "boolean" },
    ])
  );

  // Seed sample employees
  const empHash = bcryptjs.hashSync("password123", 10);
  const empStmt = db.prepare(
    `INSERT INTO employees (name, email, password_hash, department_id, role, status) VALUES (?, ?, ?, ?, ?, 'Active')`
  );

  empStmt.run("Priya Sharma", "priya@assetflow.com", empHash, 1, "Asset Manager");
  empStmt.run("Raj Kumar", "raj@assetflow.com", empHash, 1, "Employee");
  empStmt.run("Anita Desai", "anita@assetflow.com", empHash, 2, "Department Head");
  empStmt.run("Vikram Singh", "vikram@assetflow.com", empHash, 3, "Employee");
  empStmt.run("Meera Patel", "meera@assetflow.com", empHash, 4, "Employee");

  // Seed sample assets
  const assetStmt = db.prepare(
    `INSERT INTO assets (name, asset_tag, serial_number, category_id, acquisition_date, acquisition_cost, condition, location, status, is_bookable, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  assetStmt.run("Dell Laptop XPS 15", "AF-0001", "DL-XPS-001", 1, "2025-01-15", 1200, "Good", "IT Office", "Available", 0, 1);
  assetStmt.run("MacBook Pro 16", "AF-0002", "AP-MBP-002", 1, "2025-02-20", 2400, "New", "IT Office", "Available", 0, 1);
  assetStmt.run("Standing Desk", "AF-0003", "SD-ERG-001", 2, "2024-11-10", 450, "Good", "Floor 2", "Available", 0, null);
  assetStmt.run("Toyota Camry", "AF-0004", "TC-VEH-001", 3, "2024-06-01", 28000, "Good", "Parking Lot A", "Available", 1, 4);
  assetStmt.run("HP LaserJet Pro", "AF-0005", "HP-LJ-001", 4, "2025-03-01", 350, "Good", "Floor 1", "Available", 1, null);
  assetStmt.run("Conference Room A", "AF-0006", "CR-A-001", 5, "2024-01-01", 0, "Good", "Floor 3", "Available", 1, null);
  assetStmt.run("Conference Room B", "AF-0007", "CR-B-001", 5, "2024-01-01", 0, "Good", "Floor 2", "Available", 1, null);
  assetStmt.run("Dell Monitor 27\"", "AF-0008", "DL-MON-001", 1, "2025-04-10", 380, "New", "IT Office", "Available", 0, 1);
  assetStmt.run("Ergonomic Chair", "AF-0009", "EC-FUR-001", 2, "2024-12-05", 320, "Good", "Floor 1", "Available", 0, null);
  assetStmt.run("iPad Pro", "AF-0010", "AP-IPD-001", 1, "2025-05-15", 900, "New", "IT Office", "Available", 0, 1);

  console.log("✅ Database seeded successfully!");
}
