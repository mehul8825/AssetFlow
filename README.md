# AssetFlow - Enterprise Asset & Resource Management System

AssetFlow is a centralized, responsive ERP platform designed to simplify how organizations track, allocate, book, and maintain physical assets and shared resources. Built on a modern Next.js stack with an isolated SQLite data access model layer.

---

## 🚀 Features

- **Authentication & RBAC**: Custom JWT authentication with role-based access control supporting four roles: `Admin`, `Asset Manager`, `Department Head`, and `Employee`.
- **Organization Setup (Admin)**: Create departments, configure custom asset categories (with dynamic custom fields), and manage the employee directory with role promotion.
- **Asset Directory & Lifecycle**: Full lifecycle tracking (Available, Allocated, Under Maintenance, Lost, Retired) with automatic `AF-XXXX` tag generation.
- **Allocations & Transfers**: Direct allocation controls alongside a request-and-approve workflow for transferring assets between employees.
- **Resource Booking**: Shared resources (projectors, vehicles, meeting rooms) time-overlap conflict prevention booking system.
- **Maintenance Pipelines**: Repair request lifecycle (Pending ➔ Approved ➔ Assigned ➔ In Progress ➔ Resolved) with automatic asset status synchronization.
- **Audit Cycles**: Periodic physical verification audits by scope (department or location) with auditor assignment and live discrepancy reports.
- **Analytics & PDF Export**: Rich data visualizations (Recharts) detailing asset values, category distributions, and activity trends with PDF export.
- **System Activity & Notifications**: Global notification alerts and complete activity logs for audit trails.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Database**: SQLite (via `better-sqlite3` configured with WAL mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Auth**: Custom JWT session with HttpOnly cookies (`jose` + `bcryptjs`)
- **State/Fetching**: React Context + SWR
- **Charts**: Recharts

---

## 📂 Project Architecture

```text
AssetFlow/
├── app/                  # Next.js App Router Pages & API Route Handlers
│   ├── api/              # Route Handlers (calls Models directly)
│   ├── dashboard/        # Main Protected UI Routes
│   └── login/ & signup/  # Authentication UI Views
├── components/           # Reusable UI Components (shadcn/ui + app sidebar)
├── lib/                  # Helper modules (auth verification, database connectors, seeders)
├── models/               # Data Access Object (DAO) Model Layer (SQL Queries)
│   ├── asset.model.ts
│   ├── employee.model.ts
│   └── ...
├── public/               # Static assets
└── middleware.ts         # Global JWT Route Guard
```

---

## 📦 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/mehul8825/AssetFlow.git
cd AssetFlow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
JWT_SECRET=assetflow-secret-key-change-in-production
```

### 4. Seed and Start the Database
The database seeds automatically with a default admin account, mock departments, and sample categories on the first boot.
- **Default Admin Account**: `admin@assetflow.com` / `admin123`

### 5. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 🤝 Seeding Data Details

The system will spin up a fresh database with:
- **Default Admin**: `admin@assetflow.com` / `admin123`
- **Initial Departments**: Engineering, Marketing, HR, Operations
- **Asset Categories**: Laptops, Vehicles, Office Chairs, Projectors (configured with custom dynamic metadata fields)
