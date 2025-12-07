"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "../../contexts/CartContext";
import TopNavbar from "../../components/top-navbar";
import type { BookListing } from "../../components/book-listing-card";
import { getApiUrl } from "@/lib/config";

export default function BookPage() {
  const params = useParams<{ listingID: string }>();
  const listingID = params?.listingID;
  const { addToCart, cartItems } = useCart();

  const [listing, setListing] = useState<BookListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [mailtoLink, setMailtoLink] = useState<string>("");

  // Generate mailto link on client side
  useEffect(() => {
    if (listing?.seller_email && listing?.title) {
      const subject = encodeURIComponent(`bookswap - ${listing.title}`);
      const body = encodeURIComponent(
        `I'd like to buy '${listing.title}' that is listed on GMU Bookswap.\n\nListing: ${window.location.href}`
      );
      setMailtoLink(`mailto:${listing.seller_email}?subject=${subject}&body=${body}`);
    }
  }, [listing?.seller_email, listing?.title]);

  useEffect(() => {
    if (listing?.image_url) {
      setCoverImageUrl(null);
      return;
    }

    const isbn = listing?.isbn;
    if (!isbn || typeof isbn !== 'string') {
      setCoverImageUrl(null);
      return;
    }

    const cleanIsbn = isbn.replace(/\s+/g, "").trim();
    if (!cleanIsbn) {
      setCoverImageUrl(null);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function fetchBookCover() {
      setCoverLoading(true);
      try {
        const response = await fetch(
          `https://bookcover.longitood.com/bookcover/${encodeURIComponent(cleanIsbn)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch book cover");
        }

        const data = await response.json();
        if (!ignore && data.url) {
          setCoverImageUrl(data.url);
        }
      } catch (err) {
        if (!ignore && !(err instanceof DOMException && err.name === "AbortError")) {
          setCoverImageUrl(null);
        }
      } finally {
        if (!ignore) {
          setCoverLoading(false);
        }
      }
    }

    fetchBookCover();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [listing?.isbn, listing?.image_url]);

  useEffect(() => {
    if (!listingID) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function fetchListing() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(getApiUrl(`/books/${listingID}`), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(response.status === 404 ? "Listing not found." : "Failed to load listing.");
        }

        const data = await response.json();
        if (!ignore) {
          setListing(data);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setListing(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchListing();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [listingID]);

  const priceLabel = useMemo(() => {
    if (typeof listing?.price === "number") {
      return `$${listing.price.toFixed(2)}`;
    }
    if (listing?.price) {
      return `$${listing.price}`;
    }
    return "Contact seller";
  }, [listing?.price]);

  const coverImage = coverImageUrl || listing?.image_url || "/strawberry.png";
  const title = listing?.title || (loading ? "Loading…" : "Unknown Title");
  const isbn = listing?.isbn || "Not provided";
  const author = listing?.author || "Unknown";
  const condition = listing?.condition || "Not specified";
  const description = listing?.description || "No description available.";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-green-900 to-black text-white">
      <TopNavbar />

      <main className="mx-auto max-w-6xl p-6 space-y-8">
        {/* Book Listing Card */}
        <div className="flex items-center gap-8 bg-emerald-900/40 border border-yellow-600/40 rounded-2xl shadow-xl p-6 hover:bg-emerald-800/40 transition-all">
          <div className="relative flex-shrink-0">
            {coverLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/50 rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              </div>
            )}
            <img
              src={coverImage}
              alt={`${title} Cover`}
              className="w-48 h-72 object-cover rounded-xl shadow-md border border-yellow-500/30"
              onError={(e) => {
                if (coverImageUrl) {
                  e.currentTarget.src = listing?.image_url || "/strawberry.png";
                }
              }}
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-yellow-300 mb-2">{title}</h1>
            <p className="text-yellow-200 mb-2">
              <span className="font-semibold text-yellow-400">ISBN:</span> {isbn}
            </p>
            {/* <p className="text-yellow-200 mb-2">
              <span className="font-semibold text-yellow-400">Database ID:</span> {listing?.id ?? listingID}
            </p> */}
            <p className="text-yellow-200 mb-2">
              <span className="font-semibold text-yellow-400">Author:</span> {author}
            </p>
            <p className="text-yellow-200 mb-2">
              <span className="font-semibold text-yellow-400">Condition:</span> {condition}
            </p>
            <p className="text-yellow-200 mb-2">
              <span className="font-semibold text-yellow-400">Price:</span> {priceLabel}
            </p>
            {listing?.seller_email && (
              <p className="text-yellow-200 mb-4">
                <span className="font-semibold text-yellow-400">Seller:</span> {listing.seller_email}
              </p>
            )}
            <p className="text-yellow-100 leading-relaxed mb-4">{description}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (listing) {
                    addToCart({
                      id: listing.id,
                      title: listing.title,
                      author: listing.author,
                      price: listing.price || 0,
                      image_url: coverImageUrl || listing.image_url,
                      isbn: listing.isbn,
                      trade_type: listing.trade_type,
                      seller_email: listing.seller_email,
                      seller_name: listing.seller_name,
                    });
                    setAddedToCart(true);
                    setTimeout(() => setAddedToCart(false), 2000);
                  }
                }}
                disabled={loading || !!error || !listing || cartItems.some(item => item.id === listing.id)}
                className="rounded-full border border-yellow-400/70 bg-yellow-500/10
                hover:bg-yellow-400/20 px-6 py-2 text-yellow-300
                font-medium transition-all shadow-sm backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cartItems.some(item => item.id === listing?.id)
                  ? "Already in Cart"
                  : addedToCart
                    ? "Added to Cart!"
                    : "Add to Cart"}
              </button>
              {mailtoLink && (
                <a
                  href={mailtoLink}
                  className="rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300
                  text-black px-6 py-2 font-semibold transition-all shadow-[0_0_15px_rgba(255,215,0,0.4)]
                  hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] backdrop-blur-md"
                >
                  Buy Now
                </a>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-yellow-400/40 bg-white/5 backdrop-blur-lg p-4 text-yellow-200">
            Loading listing details…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/40 backdrop-blur-lg p-4 text-red-200">
            {error}
          </div>
        )}
      </main>

      {/* <footer className="mt-10 bg-emerald-950/80 text-yellow-400 text-center py-4 backdrop-blur-md border-t border-yellow-500/30 shadow-inner">
        <p className="text-sm">
          Powered by Supabase & Next.js · George Mason University © {new Date().getFullYear()}
        </p>
      </footer> */}
    </div>
  );
}