"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, CirclePlus, Loader2, MapPin, Minus, Plus, Search, ShoppingBasket, Sparkles, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type ListItem = { id: number; name: string; quantity: number; checked: number; price: number | null; imageUrl: string | null; productUrl: string | null; note: string; createdAt: string };
type Product = { id: string; title: string; price: number | null; image: string | null; link: string | null; rating: number | null };
type WebMcpTool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
type WebMcpContext = { registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void> };

const previewItems: ListItem[] = [
  { id: -1, name: "Bananas", quantity: 1, checked: 0, price: 0.58, imageUrl: null, productUrl: null, note: "1 bunch", createdAt: "" },
  { id: -2, name: "Whole milk", quantity: 2, checked: 0, price: 3.16, imageUrl: null, productUrl: null, note: "Great Value, gallon", createdAt: "" },
  { id: -3, name: "Tortilla chips", quantity: 1, checked: 1, price: 2.74, imageUrl: null, productUrl: null, note: "", createdAt: "" },
];

function money(value: number | null) { return value == null ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }

export default function Home() {
  const [items, setItems] = useState<ListItem[]>(previewItems);
  const [loading, setLoading] = useState(true);
  const [quickItem, setQuickItem] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const remaining = items.filter((item) => !item.checked);
  const done = items.filter((item) => item.checked);
  const estimate = useMemo(() => remaining.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0), [remaining]);

  useEffect(() => {
    fetch("/api/items").then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ items: ListItem[] }>; })
      .then((data) => setItems(data.items)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  async function addItem(input: Partial<ListItem> & { name: string }) {
    const optimisticId = -Date.now();
    const optimistic: ListItem = { id: optimisticId, name: input.name, quantity: input.quantity ?? 1, checked: 0, price: input.price ?? null, imageUrl: input.imageUrl ?? null, productUrl: input.productUrl ?? null, note: input.note ?? "", createdAt: new Date().toISOString() };
    setItems((current) => [optimistic, ...current.filter((item) => item.id > 0)]);
    try {
      const response = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { item: ListItem };
      setItems((current) => current.map((item) => item.id === optimisticId ? data.item : item));
      toast.success(`${input.name} added`);
    } catch { setItems((current) => current.filter((item) => item.id !== optimisticId)); toast.error("Couldn’t add that item. Try again."); }
  }

  async function addQuickItem(event: React.FormEvent) { event.preventDefault(); const name = quickItem.trim(); if (!name) return; setQuickItem(""); await addItem({ name }); }
  async function updateItem(id: number, changes: Partial<ListItem>) {
    const before = items; setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    try { const response = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) }); if (!response.ok) throw new Error(); }
    catch { setItems(before); toast.error("Couldn’t update the list."); }
  }
  async function removeItem(id: number) {
    const before = items; setItems((current) => current.filter((item) => item.id !== id));
    try { const response = await fetch(`/api/items/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); }
    catch { setItems(before); toast.error("Couldn’t remove that item."); }
  }
  async function searchProducts(event: React.FormEvent) {
    event.preventDefault(); const term = query.trim(); if (!term) return; setSearching(true); setSearchError("");
    try { const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`); const data = await response.json() as { products: Product[]; error?: string }; if (!response.ok) throw new Error(data.error || "Search is unavailable"); setResults(data.products); }
    catch (error) { setResults([]); setSearchError(error instanceof Error ? error.message : "Search is unavailable"); }
    finally { setSearching(false); }
  }

  useEffect(() => {
    const context = typeof document === "undefined" ? undefined : (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch {} };
    register({ name: "read_shopping_list", title: "Read shopping list", description: "Return the current shared shopping list, including quantities and checked status.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async () => fetch("/api/items").then((response) => response.json()) });
    register({ name: "add_shopping_item", title: "Add shopping item", description: "Add one item to the shared shopping list.", inputSchema: { type: "object", properties: { name: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: 99 } }, required: ["name"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => { const value = input as { name?: string; quantity?: number }; if (!value.name?.trim()) throw new Error("name is required"); const response = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); if (!response.ok) throw new Error("Item could not be added"); const data = await response.json() as { item: ListItem }; setItems((current) => [data.item, ...current]); return { item: data.item }; } });
    return () => lifecycle.abort();
  }, []);

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-white/10 bg-[#0756b6] text-white"><div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#ffc220] text-[#063f85] shadow-sm"><ShoppingBasket className="size-6" strokeWidth={2.5} /></span><div><h1 className="text-xl font-black tracking-tight sm:text-2xl">Lincoln Cart</h1><p className="flex items-center gap-1.5 text-sm text-blue-100"><MapPin className="size-3.5" /> Walmart #199 · Lincoln, IL</p></div></div>
      <div className="flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-sm font-semibold"><Users className="size-4" /><span className="hidden sm:inline">Shared list</span><span className="size-2 rounded-full bg-[#ffc220]" aria-label="Connected" /></div>
    </div></header>
    <div className="mx-auto grid max-w-[1380px] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(370px,.9fr)] lg:py-8">
      <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">This week</p><h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Shopping list</h2></div><div className="rounded-2xl border border-border bg-card px-4 py-3 text-right shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Est. remaining</p><p className="text-2xl font-black text-[#0756b6]">{money(estimate)}</p></div></div>
        <form onSubmit={addQuickItem} className="mb-5 flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"><Input value={quickItem} onChange={(event) => setQuickItem(event.target.value)} placeholder="Add milk, apples, paper towels…" aria-label="Item name" className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0" /><Button type="submit" disabled={!quickItem.trim()} className="h-12 rounded-xl bg-[#0756b6] px-5 font-bold hover:bg-[#064b9f]"><CirclePlus className="size-5" /> Add</Button></form>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="font-extrabold">To pick up</p><span className="rounded-full bg-[#e9f2ff] px-2.5 py-1 text-xs font-bold text-[#0756b6]">{remaining.length} {remaining.length === 1 ? "item" : "items"}</span></div>
          {loading ? <div className="space-y-3 p-5">{[0,1,2].map((key) => <Skeleton key={key} className="h-16 w-full rounded-2xl" />)}</div> : remaining.length === 0 ? <div className="grid min-h-52 place-items-center p-8 text-center"><div><span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#e7f7ed] text-[#17743b]"><Check /></span><p className="font-extrabold">All picked up</p><p className="mt-1 text-sm text-muted-foreground">Add another item or search the Lincoln store.</p></div></div> : <div className="divide-y divide-border">{remaining.map((item) => <ItemRow key={item.id} item={item} updateItem={updateItem} removeItem={removeItem} />)}</div>}
          {done.length > 0 && <details className="border-t border-border" open><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-extrabold text-muted-foreground">Picked up <span className="flex items-center gap-2 text-sm font-bold">{done.length}<ChevronDown className="size-4" /></span></summary><div className="divide-y divide-border border-t border-border bg-muted/35">{done.map((item) => <ItemRow key={item.id} item={item} updateItem={updateItem} removeItem={removeItem} />)}</div></details>}
        </div>
      </section>
      <aside className="min-w-0 rounded-3xl bg-[#092f62] p-4 text-white shadow-[0_24px_60px_rgba(7,37,79,.22)] sm:p-6 lg:sticky lg:top-6 lg:self-start"><div className="mb-5"><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#ffc220]"><Sparkles className="size-3.5" /> Local product finder</p><h2 className="mt-2 text-2xl font-black">Search Walmart #199</h2><p className="mt-1 text-sm text-blue-100">825 Malerich Dr · prices may change</p></div>
        <form onSubmit={searchProducts} className="flex gap-2 rounded-2xl bg-white p-2"><Search className="ml-2 mt-3 size-5 shrink-0 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “coffee” or “cat litter”" aria-label="Search Walmart products" className="h-11 min-w-0 border-0 bg-transparent text-base text-slate-950 shadow-none focus-visible:ring-0" /><Button type="submit" disabled={searching || !query.trim()} className="h-11 rounded-xl bg-[#ffc220] px-4 font-black text-[#062c5b] hover:bg-[#ffd45b]">{searching ? <Loader2 className="animate-spin" /> : "Search"}</Button></form>
        {searchError && <div className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-300/10 p-4 text-sm text-amber-50">{searchError}</div>}
        <div className="mt-4 max-h-[58vh] space-y-3 overflow-y-auto pr-1 scrollbar-thin">{results.length === 0 && !searching && !searchError ? <div className="rounded-2xl border border-dashed border-blue-200/30 p-8 text-center text-blue-100"><Search className="mx-auto mb-3 size-8 text-blue-200/70" /><p className="font-bold text-white">Find the exact item</p><p className="mt-1 text-sm">Search local Walmart results, then add one tap to your list.</p></div> : results.map((product) => <ProductCard key={product.id} product={product} addItem={addItem} />)}{searching && [0,1,2].map((key) => <Skeleton key={key} className="h-28 w-full rounded-2xl bg-white/10" />)}</div>
      </aside>
    </div><Toaster richColors position="bottom-center" />
  </main>;
}

function ItemRow({ item, updateItem, removeItem }: { item: ListItem; updateItem: (id: number, changes: Partial<ListItem>) => void; removeItem: (id: number) => void }) {
  return <div className={`group flex items-center gap-3 px-4 py-4 sm:px-5 ${item.checked ? "opacity-60" : ""}`}><Checkbox checked={Boolean(item.checked)} onCheckedChange={(checked) => updateItem(item.id, { checked: checked ? 1 : 0 })} aria-label={`Mark ${item.name} ${item.checked ? "not picked up" : "picked up"}`} className="size-6 rounded-full border-2 data-[state=checked]:border-[#147d3f] data-[state=checked]:bg-[#147d3f]" /><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : <ShoppingBasket className="size-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><p className={`truncate font-extrabold ${item.checked ? "line-through" : ""}`}>{item.name}</p><p className="truncate text-sm text-muted-foreground">{item.note || (item.price == null ? "Added manually" : `${money(item.price)} each`)}</p></div><div className="flex items-center rounded-xl border border-border bg-background p-0.5"><Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => item.quantity > 1 ? updateItem(item.id, { quantity: item.quantity - 1 }) : removeItem(item.id)} aria-label={`Decrease ${item.name}`}><Minus className="size-3.5" /></Button><span className="w-7 text-center text-sm font-black">{item.quantity}</span><Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} aria-label={`Increase ${item.name}`}><Plus className="size-3.5" /></Button></div><Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground opacity-70 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></Button></div>;
}

function ProductCard({ product, addItem }: { product: Product; addItem: (item: Partial<ListItem> & { name: string }) => void }) {
  return <article className="flex gap-3 rounded-2xl bg-white p-3 text-slate-950 shadow-sm"><div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{product.image ? <img src={product.image} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : <ShoppingBasket className="size-7 text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-extrabold leading-snug">{product.title}</p><div className="mt-2 flex items-center justify-between gap-3"><div><p className="font-black text-[#0756b6]">{money(product.price)}</p>{product.rating != null && <p className="text-xs text-slate-500">★ {product.rating.toFixed(1)}</p>}</div><Button size="sm" onClick={() => addItem({ name: product.title, price: product.price, imageUrl: product.image, productUrl: product.link })} className="rounded-xl bg-[#0756b6] font-bold hover:bg-[#064b9f]"><Plus className="size-4" /> Add</Button></div></div></article>;
}
