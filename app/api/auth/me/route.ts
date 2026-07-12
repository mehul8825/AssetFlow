import { getCurrentUser } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

// GET /api/auth/me
export async function GET() {
  try {
    seedDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ user: null }, { status: 401 });
    }

    return Response.json({ user });
  } catch {
    return Response.json({ user: null }, { status: 401 });
  }
}
