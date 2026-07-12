import { getDb } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { createToken } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { type NextRequest } from "next/server";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    // Ensure database is seeded
    seedDatabase();

    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare(
        `SELECT id, name, email, password_hash, role, department_id, status FROM employees WHERE email = ?`
      )
      .get(email) as any;

    if (!user) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status !== "Active") {
      return Response.json(
        { error: "Account is inactive. Contact your administrator." },
        { status: 403 }
      );
    }

    const passwordMatch = bcryptjs.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
    });

    // Log activity
    db.prepare(
      `INSERT INTO activity_logs (employee_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`
    ).run(user.id, "LOGIN", "Employee", user.id, `${user.name} logged in`);

    const response = Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
      },
      message: "Login successful",
    });

    // Set cookie
    response.headers.set(
      "Set-Cookie",
      `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    );

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
