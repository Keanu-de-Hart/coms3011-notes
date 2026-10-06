import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    return Response.json({ status: "ok" });
  } catch (err) {
    return Response.json({ status: "error", message: (err as Error).message }, { status: 503 });
  }
}
