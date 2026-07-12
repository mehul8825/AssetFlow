import { getDb } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import bcryptjs from "bcryptjs";
import { type NextRequest } from "next/server";

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  try {
    seedDatabase();

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const existing = db
      .prepare("SELECT id FROM employees WHERE email = ?")
      .get(email);

    if (existing) {
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = bcryptjs.hashSync(password, 10);

    // Signup always creates an Employee role
    const result = db
      .prepare(
        `INSERT INTO employees (name, email, password_hash, role, status) VALUES (?, ?, ?, 'Employee', 'Active')`
      )
      .run(name, email, passwordHash);

    // Log activity
    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`
    ).run(
      result.lastInsertRowid,
      "SIGNUP",
      "Employee",
      result.lastInsertRowid,
      `${name} signed up`
    );

    return Response.json(
      {
        message: "Account created successfully. You can now log in.",
        user: {
          id: result.lastInsertRowid,
          name,
          email,
          role: "Employee",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
