import Database from "better-sqlite3";
import path from "path";

// Singleton pattern for database connection
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "db.sqlite");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
    runMigrations(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    -- ============================================
    -- DEPARTMENTS
    -- ============================================
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      head_employee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- ASSET CATEGORIES
    -- ============================================
    CREATE TABLE IF NOT EXISTS asset_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      custom_fields TEXT, -- JSON string for category-specific fields
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- EMPLOYEES (Users)
    -- ============================================
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      role TEXT NOT NULL DEFAULT 'Employee' CHECK(role IN ('Admin', 'Asset Manager', 'Department Head', 'Employee')),
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      phone TEXT,
      avatar_url TEXT,
      salary_deductions REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- ASSETS
    -- ============================================
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      asset_tag TEXT NOT NULL UNIQUE,
      serial_number TEXT,
      category_id INTEGER NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
      description TEXT,
      acquisition_date TEXT,
      acquisition_cost REAL,
      condition TEXT NOT NULL DEFAULT 'Good' CHECK(condition IN ('New', 'Good', 'Fair', 'Poor', 'Damaged')),
      location TEXT,
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed')),
      is_bookable INTEGER NOT NULL DEFAULT 0,
      photo_url TEXT,
      documents TEXT, -- JSON array of document URLs
      custom_fields TEXT, -- JSON for category-specific field values
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- ASSET ALLOCATIONS
    -- ============================================
    CREATE TABLE IF NOT EXISTS asset_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      allocated_to_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      allocated_to_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      allocated_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      allocation_date TEXT NOT NULL DEFAULT (datetime('now')),
      expected_return_date TEXT,
      actual_return_date TEXT,
      return_condition TEXT,
      return_notes TEXT,
      fine_amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Returned', 'Overdue', 'Transferred')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- TRANSFER REQUESTS
    -- ============================================
    CREATE TABLE IF NOT EXISTS transfer_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      from_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      to_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      requested_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      approved_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Requested' CHECK(status IN ('Requested', 'Approved', 'Rejected', 'Completed')),
      reason TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- RESOURCE BOOKINGS
    -- ============================================
    CREATE TABLE IF NOT EXISTS resource_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      booked_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Upcoming' CHECK(status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- MAINTENANCE REQUESTS
    -- ============================================
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      requested_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      approved_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      assigned_technician TEXT,
      assigned_to_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Assigned', 'In Progress', 'Resolved')),
      resolution_notes TEXT,
      quotations TEXT,
      cost REAL DEFAULT 0,
      photo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- AUDIT CYCLES
    -- ============================================
    CREATE TABLE IF NOT EXISTS audit_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scope_type TEXT NOT NULL CHECK(scope_type IN ('Department', 'Location')),
      scope_value TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Closed')),
      created_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      closed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- AUDIT CYCLE AUDITORS (many-to-many)
    -- ============================================
    CREATE TABLE IF NOT EXISTS audit_cycle_auditors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_cycle_id INTEGER NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(audit_cycle_id, employee_id)
    );

    -- ============================================
    -- AUDIT ITEMS (per-asset verification)
    -- ============================================
    CREATE TABLE IF NOT EXISTS audit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_cycle_id INTEGER NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      audited_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Verified', 'Missing', 'Damaged')),
      notes TEXT,
      audited_at TEXT,
      resolution_status TEXT CHECK(resolution_status IN ('Unresolved', 'Resolved')),
      resolution_action TEXT CHECK(resolution_action IN ('Confirm_Lost', 'Confirm_Damaged', 'Override_Verified')),
      resolved_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- NOTIFICATIONS
    -- ============================================
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- ACTIVITY LOGS
    -- ============================================
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- INDEXES
    -- ============================================
    CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
    CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_asset ON asset_allocations(asset_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_employee ON asset_allocations(allocated_to_employee_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_status ON asset_allocations(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_asset ON resource_bookings(asset_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_time ON resource_bookings(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_requests(asset_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON activity_logs(employee_id);
    CREATE INDEX IF NOT EXISTS idx_audit_items_cycle ON audit_items(audit_cycle_id);
  `);

  // Add foreign key for departments.head_employee_id after employees table exists
  // (handled via application logic since SQLite doesn't support ADD CONSTRAINT)
}

function runMigrations(db: Database.Database) {
  const info = db.prepare("PRAGMA table_info(audit_items)").all() as any[];
  const hasResolutionStatus = info.some((col: any) => col.name === "resolution_status");
  if (!hasResolutionStatus) {
    db.exec(`
      ALTER TABLE audit_items ADD COLUMN resolution_status TEXT CHECK(resolution_status IN ('Unresolved', 'Resolved'));
      ALTER TABLE audit_items ADD COLUMN resolution_action TEXT CHECK(resolution_action IN ('Confirm_Lost', 'Confirm_Damaged', 'Override_Verified'));
      ALTER TABLE audit_items ADD COLUMN resolved_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
      ALTER TABLE audit_items ADD COLUMN resolved_at TEXT;
      ALTER TABLE audit_items ADD COLUMN resolution_notes TEXT;
    `);
  }

  const hasUpdatedAt = info.some((col: any) => col.name === "updated_at");
  if (!hasUpdatedAt) {
    db.exec(`
      ALTER TABLE audit_items ADD COLUMN updated_at TEXT;
    `);
  }
}

export default getDb;
