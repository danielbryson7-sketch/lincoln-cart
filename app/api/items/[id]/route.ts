import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shoppingItems } from "@/db/schema";

const cors = {
  "access-control-allow-origin": "https://danielbryson7-sketch.github.io",
  "access-control-allow-methods": "PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type",
};
function json(body: unknown, init?: ResponseInit) { return Response.json(body, { ...init, headers: { ...cors, ...init?.headers } }); }
export async function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

function readId(params: Promise<{ id: string }>) { return params.then(({ id }) => Number.parseInt(id, 10)); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await readId(params);
    if (!Number.isInteger(id) || id < 1) return json({ error: "Invalid item." }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    const changes: { quantity?: number; checked?: number; note?: string } = {};
    if (payload.quantity !== undefined) changes.quantity = Math.min(99, Math.max(1, Number(payload.quantity) || 1));
    if (payload.checked !== undefined) changes.checked = payload.checked ? 1 : 0;
    if (typeof payload.note === "string") changes.note = payload.note.trim().slice(0, 180);
    if (!Object.keys(changes).length) return json({ error: "No supported changes." }, { status: 400 });
    const [item] = await getDb().update(shoppingItems).set(changes).where(eq(shoppingItems.id, id)).returning();
    if (!item) return json({ error: "Item not found." }, { status: 404 });
    return json({ item });
  } catch { return json({ error: "The shared list is temporarily unavailable." }, { status: 503 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await readId(params);
    if (!Number.isInteger(id) || id < 1) return json({ error: "Invalid item." }, { status: 400 });
    await getDb().delete(shoppingItems).where(eq(shoppingItems.id, id));
    return new Response(null, { status: 204, headers: cors });
  } catch { return json({ error: "The shared list is temporarily unavailable." }, { status: 503 }); }
}
