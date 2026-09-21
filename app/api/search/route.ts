import { env } from "cloudflare:workers";

type SerpProduct = { product_id?: string; us_item_id?: string; title?: string; primary_offer?: { offer_price?: number }; price?: number; thumbnail?: string; product_page_url?: string; link?: string; rating?: number };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (!query) return Response.json({ error: "Enter something to search for." }, { status: 400 });
  const apiKey = (env as unknown as { SERPAPI_KEY?: string }).SERPAPI_KEY;
  if (!apiKey) return Response.json({ error: "Walmart search needs a SerpAPI key before it can go live." }, { status: 503 });

  const search = new URL("https://serpapi.com/search.json");
  search.searchParams.set("engine", "walmart");
  search.searchParams.set("query", query);
  search.searchParams.set("store_id", "199");
  search.searchParams.set("api_key", apiKey);
  search.searchParams.set("device", "desktop");

  try {
    const response = await fetch(search, { headers: { accept: "application/json" } });
    const data = await response.json() as { error?: string; organic_results?: SerpProduct[] };
    if (!response.ok || data.error) throw new Error(data.error || "Walmart search failed");
    const products = (data.organic_results ?? []).slice(0, 12).map((result, index) => ({
      id: result.product_id || result.us_item_id || `${index}-${result.title}`,
      title: result.title || "Walmart item",
      price: result.primary_offer?.offer_price ?? result.price ?? null,
      image: result.thumbnail ?? null,
      link: result.product_page_url ?? result.link ?? null,
      rating: result.rating ?? null,
    }));
    return Response.json({ products, store: { id: "199", city: "Lincoln", state: "IL" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Search failed";
    return Response.json({ error: `Walmart search is temporarily unavailable. ${detail}` }, { status: 502 });
  }
}
