import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { shoppingItems } from "@/db/schema";

const cors = {
  "access-control-allow-origin": "https://danielbryson7-sketch.github.io",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { ...cors, ...init?.headers } });
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

function message(error: unknown) {
  const value = error instanceof Error ? error.message : "Unexpected error";
  return value.includes("no such table") ? "The shared list is being prepared. Try again shortly." : "The shared list is temporarily unavailable.";
}

export async function GET() {
  try {
    const items = await getDb().select().from(shoppingItems).orderBy(desc(shoppingItems.createdAt), desc(shoppingItems.id));
    return json({ items });
  } catch (error) { return json({ error: message(error) }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 180) : "";
    if (!name) return json({ error: "Item name is required." }, { status: 400 });
    const quantity = Math.min(99, Math.max(1, Number(payload.quantity) || 1));
    const price = typeof payload.price === "number" && Number.isFinite(payload.price) ? Math.max(0, payload.price) : null;
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 180) : "";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.slice(0, 1600) : null;
    const productUrl = typeof payload.productUrl === "string" ? payload.productUrl.slice(0, 1600) : null;
    const [item] = await getDb().insert(shoppingItems).values({ name, quantity, price, note, imageUrl, productUrl }).returning();
    return json({ item }, { status: 201 });
  } catch (error) { return json({ error: message(error) }, { status: 503 }); }
}
