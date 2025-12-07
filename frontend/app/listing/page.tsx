"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import TopNavbar from "@/app/components/top-navbar";
import BookListingCard, { type BookListing } from "@/app/components/book-listing-card";
import { BookListingSkeleton } from "@/app/components/LoadingSkeleton";
import { getApiUrl } from "@/lib/config";

type SearchBy = "Any" | "Title" | "Author" | "ISBN" | "Genre";
type Condition = "Contains" | "Contains exact phrase" | "Starts with";
type MaterialType = "All items" | "Articles" | "Books" | "Journals";
type Sort = "relevance" | "newest" | "price-asc" | "price-desc";

const mtLabelToValue = (m: MaterialType) =>
  m === "Books" ? "book" : m === "Journals" ? "journal" : m === "Articles" ? "article" : undefined;

const debounce = <T extends (...a: any[]) => void>(fn: T, delay = 350) => {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

export default function AdvancedSearchPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [term, setTerm] = useState("");
  const [searchBy, setSearchBy] = useState<SearchBy>("Any");
  const [condition, setCondition] = useState<Condition>("Contains");
  const [materialType, setMaterialType] = useState<MaterialType>("All items");
  const [sort, setSort] = useState<Sort>("relevance");

  const [items, setItems] = useState<BookListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [debounced, setDebounced] = useState("");
  const debouncer = useMemo(() => debounce(setDebounced, 400), []);
  useEffect(() => debouncer(term), [term, debouncer]);

  /** ----- Build & run query (core logic the button triggers) ----- */
  async function runQuery(activeTerm: string) {
    setLoading(true);
    setErr(null);

    try {
      const response = await fetch(getApiUrl("/books/"));
      
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      
      const data = await response.json();
      
      let filtered = Array.isArray(data) ? [...data] : [];
      
      const mt = mtLabelToValue(materialType);
      if (mt) {
        filtered = filtered.filter((item: BookListing) => item.material_type === mt);
      }

      const trimmed = activeTerm.trim();
      if (trimmed) {
        const searchLower = trimmed.toLowerCase();
        filtered = filtered.filter((item: BookListing) => {
          if (searchBy === "Any") {
            return (
              item.title?.toLowerCase().includes(searchLower) ||
              item.author?.toLowerCase().includes(searchLower) ||
              item.isbn?.toLowerCase().includes(searchLower) ||
              item.genre?.toLowerCase().includes(searchLower)
            );
          } else if (searchBy === "Title") {
            const title = item.title?.toLowerCase() || "";
            if (condition === "Starts with") return title.startsWith(searchLower);
            if (condition === "Contains exact phrase") return title === searchLower;
            return title.includes(searchLower);
          } else if (searchBy === "Author") {
            const author = item.author?.toLowerCase() || "";
            if (condition === "Starts with") return author.startsWith(searchLower);
            if (condition === "Contains exact phrase") return author === searchLower;
            return author.includes(searchLower);
          } else if (searchBy === "Genre") {
            const genre = item.genre?.toLowerCase() || "";
            if (condition === "Starts with") return genre.startsWith(searchLower);
            if (condition === "Contains exact phrase") return genre === searchLower;
            return genre.includes(searchLower);
          } else if (searchBy === "ISBN") {
            const isbn = item.isbn?.toLowerCase() || "";
            if (condition === "Contains exact phrase") return isbn === searchLower;
            if (condition === "Starts with") return isbn.startsWith(searchLower);
            return isbn.includes(searchLower);
          }
          return true;
        });
      }

      if (sort === "newest") {
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      } else if (sort === "price-asc") {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === "price-desc") {
        filtered.sort((a, b) => b.price - a.price);
      }

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = filtered.slice(start, end);

      setItems(paginated);
      setTotal(total);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "An error occurred");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const prevFiltersKey = useRef("");
  const prevPage = useRef(1);
  
  useEffect(() => {
    const filtersKey = JSON.stringify({ searchBy, condition, debounced, materialType, sort });
    const filtersChanged = prevFiltersKey.current && prevFiltersKey.current !== filtersKey;
    const pageChanged = prevPage.current !== page;
    
    prevFiltersKey.current = filtersKey;
    prevPage.current = page;
    
    runQuery(debounced);
    
    if (filtersChanged && !pageChanged && page !== 1) {
      setPage(1);
    }
  }, [searchBy, condition, debounced, materialType, sort, page, pageSize]);

  function onAdvancedClick() {
    setShowFilters((s) => !s);
    runQuery(term);
    requestAnimationFrame(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      setPage(1);
      runQuery(term);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-green-900 to-black text-white">
      <TopNavbar />

      <main className="mx-auto max-w-6xl p-6">
        {/* Top search row */}
        <div className="mb-6 flex gap-3">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onEnter}
            placeholder="Search"
            className="w-full rounded-2xl border border-yellow-500/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400/60 backdrop-blur-md"
          />
          <button
            onClick={onAdvancedClick}
            className="rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-6 py-3 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all"
          >
            Advanced Search
          </button>
        </div>

        {/* Filters card (same layout, just wired) */}
        {showFilters && (
          <section className="mb-4 rounded-2xl border border-yellow-400/40 bg-white/5 backdrop-blur-lg p-4 shadow">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm">Search by</label>
                <select
                  className="rounded-xl border border-yellow-400/50 bg-white/10 px-3 py-2"
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value as SearchBy)}
                >
                  {(["Any","Title","Author","ISBN","Genre"] as SearchBy[]).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl border border-yellow-400/50 bg-white/10 px-3 py-2"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as Condition)}
                >
                  {(["Contains","Contains exact phrase","Starts with"] as Condition[]).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onEnter}
                placeholder="Search term"
                className="min-w-[220px] flex-1 rounded-xl border border-yellow-400/50 bg-white/10 px-3 py-2"
              />

              <div className="flex items-center gap-2">
                <label className="text-sm">Material Type</label>
                <select
                  className="rounded-xl border border-yellow-400/50 bg-white/10 px-3 py-2"
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                >
                  {(["All items","Articles","Books","Journals"] as MaterialType[]).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <label className="text-sm">Sort</label>
                <select
                  className="rounded-xl border border-yellow-400/50 bg-white/10 px-3 py-2"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                >
                  <option value="relevance">Best match</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        <section id="results" className="rounded-2xl border border-yellow-400/40 bg-white/5 backdrop-blur-lg p-6 shadow">
          {loading ? (
            <BookListingSkeleton count={pageSize} />
          ) : err ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-red-400 text-lg font-semibold mb-2">Error loading listings</p>
                <p className="text-red-300/80 text-sm">{err}</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-yellow-200 text-lg font-semibold mb-2">No results found</p>
                <p className="text-yellow-300/70 text-sm">Try a different search term or broaden your filters.</p>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <li key={r.id} className="h-full">
                  <BookListingCard
                    listing={r}
                    variant="default"
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {items.length > 0 && (
            <div className="mt-6 pt-5 border-t border-yellow-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-yellow-200/90">
                <span className="font-medium">Items per page:</span>
                <select
                  className="rounded-lg border border-yellow-400/50 bg-white/10 text-yellow-50 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[12,24,48].map(n => <option key={n} value={n} className="bg-emerald-950">{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-yellow-400/50 bg-white/10 text-yellow-50 px-4 py-2 hover:bg-yellow-400/20 hover:border-yellow-400/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 transition-all font-medium"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm text-yellow-200/90 font-medium min-w-[100px] text-center">
                  Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
                </span>
                <button
                  className="rounded-lg border border-yellow-400/50 bg-white/10 text-yellow-50 px-4 py-2 hover:bg-yellow-400/20 hover:border-yellow-400/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 transition-all font-medium"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pageCount}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* <footer className="mt-10 bg-emerald-950/80 text-yellow-400 text-center py-4 backdrop-blur-md border-t border-yellow-500/30 shadow-inner">
        <p className="text-sm">
          George Mason University © {new Date().getFullYear()}
        </p>
      </footer> */}
    </div>
  );
}
