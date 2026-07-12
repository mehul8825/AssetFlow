import { type NextRequest } from "next/server";

// POST /api/auth/logout
export async function POST(_request: NextRequest) {
  const response = Response.json({ message: "Logged out successfully" });
  response.headers.set(
    "Set-Cookie",
    "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return response;
}
