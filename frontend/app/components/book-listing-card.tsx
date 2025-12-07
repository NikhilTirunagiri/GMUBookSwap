"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export type BookListing = {
  id: number | string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  genre?: string | null;
  material_type?: string | null;
  trade_type?: string | null;
  price: number;
  condition?: string | null;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  seller_name?: string | null;
  seller_email?: string | null;
};

type BookListingCardProps = {
  listing: BookListing;
  variant?: "default" | "my-listings";
  onDelete?: (id: number | string) => void;
  isDeleting?: boolean;
};

export default function BookListingCard({
  listing,
  variant = "default",
  onDelete,
  isDeleting = false,
}: BookListingCardProps) {
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [mailtoLink, setMailtoLink] = useState<string>("");

  // Generate mailto link on client side
  useEffect(() => {
    if (listing.seller_email) {
      const subject = encodeURIComponent(`bookswap - ${listing.title}`);
      const body = encodeURIComponent(
        `I'd like to buy '${listing.title}' that is listed on GMU Bookswap.\n\nListing: ${window.location.origin}/listing/${listing.id}`
      );
      setMailtoLink(`mailto:${listing.seller_email}?subject=${subject}&body=${body}`);
    }
  }, [listing.seller_email, listing.title, listing.id]);

  useEffect(() => {
    if (listing.image_url) {
      setCoverImageUrl(null);
      return;
    }

    const isbn = listing.isbn;
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
      }
    }

    fetchBookCover();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [listing.isbn, listing.image_url]);

  const displayImage = coverImageUrl || listing.image_url || "/strawberry.png";

  return (
    <div className="h-full flex flex-col rounded-xl border border-yellow-400/30 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-black/90 p-5 hover:border-yellow-400/60 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all">
      {/* Image */}
      <div className="mb-4 flex-shrink-0">
        <img
          src={displayImage}
          alt={listing.title}
          className="w-full h-64 object-cover rounded-xl border border-yellow-500/30"
          onError={(e) => {
            if (coverImageUrl) {
              e.currentTarget.src = listing.image_url || "/strawberry.png";
            } else {
              e.currentTarget.src = "/strawberry.png";
            }
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
            {listing.trade_type || "buy"}
          </span>
          <span className="text-xl font-bold text-yellow-400">
            ${listing.price.toFixed(2)}
          </span>
        </div>

        <h3 className="text-lg font-bold text-yellow-50 line-clamp-2 flex-shrink-0">
          {listing.title}
        </h3>

        {listing.author && (
          <p className="text-sm text-yellow-200/90 line-clamp-1 flex-shrink-0">
            by {listing.author}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-yellow-400/20 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider text-yellow-400/90 bg-yellow-500/10">
            {listing.material_type || "book"}
          </span>
          {listing.condition && (
            <span className="text-xs text-yellow-300/70">
              {listing.condition}
            </span>
          )}
        </div>

        {/* Actions - always at bottom */}
        <div className="flex gap-2 pt-2 mt-auto flex-shrink-0">
          {variant === "my-listings" ? (
            <>
              <Link
                href={`/listing/${listing.id}`}
                className="flex-1 text-center rounded-lg border border-yellow-400/50 bg-white/10 text-yellow-50 px-3 py-2 hover:bg-yellow-400/20 transition-all text-sm font-medium"
              >
                View
              </Link>
              {onDelete && (
                <button
                  onClick={() => onDelete(listing.id)}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg border border-red-400/50 bg-red-900/20 text-red-300 px-3 py-2 hover:bg-red-900/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                href={`/listing/${listing.id}`}
                className="flex-1 text-center rounded-lg border border-yellow-400/50 bg-white/10 text-yellow-50 px-3 py-2 hover:bg-yellow-400/20 transition-all text-sm font-medium"
              >
                View Details
              </Link>
              {mailtoLink ? (
                <a
                  href={mailtoLink}
                  className="flex-1 text-center rounded-lg bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all text-sm"
                >
                  Buy Now
                </a>
              ) : (
                <Link
                  href={`/listing/${listing.id}`}
                  className="flex-1 text-center rounded-lg bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all text-sm"
                >
                  Buy Now
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

