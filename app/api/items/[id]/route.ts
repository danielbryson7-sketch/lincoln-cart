import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shoppingItems } from "@/db/schema";

function readId(params: Promise<{ id: string }>) { return params.then(({ id }) => Number.parseInt(id, 10)); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await readId(params);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid item." }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    const changes: { quantity?: number; checked?: number; note?: string } = {};
    if (payload.quantity !== undefined) changes.quantity = Math.min(99, Math.max(1, Number(payload.quantity) || 1));
    if (payload.checked !== undefined) changes.checked = payload.checked ? 1 : 0;
    if (typeof payload.note === "string") changes.note = payload.note.trim().slice(0, 180);
    if (!Object.keys(changes).length) return Response.json({ error: "No supported changes." }, { status: 400 });
    const [item] = await getDb().update(shoppingItems).set(changes).where(eq(shoppingItems.id, id)).returning();
    if (!item) return Response.json({ error: "Item not found." }, { status: 404 });
    return Response.json({ item });
  } catch { return Response.json({ error: "The shared list is temporarily unavailable." }, { status: 503 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await readId(params);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid item." }, { status: 400 });
    await getDb().delete(shoppingItems).where(eq(shoppingItems.id, id));
    return new Response(null, { status: 204 });
  } catch { return Response.json({ error: "The shared list is temporarily unavailable." }, { status: 503 }); }
}
