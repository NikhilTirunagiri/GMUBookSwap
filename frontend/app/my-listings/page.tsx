"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopNavbar from "../components/top-navbar";
import BookListingCard, { type BookListing } from "../components/book-listing-card";
import { BookListingSkeleton } from "../components/LoadingSkeleton";
import { apiGet, apiDelete, handleApiError, getCurrentUser } from "@/lib/api";


export default function MyListingsPage() {
  const [listings, setListings] = useState<BookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get current user's email on mount
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
      }
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchListings();
    }
  }, [userEmail]);

  const fetchListings = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);
      setError(null);

      // Use authenticated API call
      const response = await apiGet("/books/");

      if (!response.ok) {
        await handleApiError(response);
      }

      const data = await response.json();
      // CRITICAL FIX #2: Filter to show only current user's listings
      const userListings = Array.isArray(data)
        ? data.filter((listing: BookListing) => listing.seller_email === userEmail)
        : [];
      setListings(userListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    // Verify ownership before deleting
    const listing = listings.find(l => l.id === id);
    if (listing && listing.seller_email !== userEmail) {
      alert("You can only delete your own listings");
      return;
    }

    try {
      setDeletingId(id);

      // Use authenticated API call
      const response = await apiDelete(`/books/${id}`);

      if (!response.ok) {
        await handleApiError(response);
      }

      // Remove from local state
      setListings((prev) => prev.filter((listing) => listing.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-green-900 to-black text-white">
      <TopNavbar />

      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-yellow-400">My Listings</h1>
          <Link
            href="/sell"
            className="rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-6 py-3 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all"
          >
            + Create New Listing
          </Link>
        </div>

        {loading ? (
          <BookListingSkeleton count={6} />
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 text-lg font-semibold mb-2">Error loading listings</p>
              <p className="text-red-300/80 text-sm mb-4">{error}</p>
              <button
                onClick={fetchListings}
                className="rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 px-4 py-2 hover:bg-yellow-400/20 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-yellow-400/40 bg-white/5 backdrop-blur-lg p-12 text-center">
            <p className="text-yellow-200 text-xl mb-4">You haven't created any listings yet</p>
            <Link
              href="/sell"
              className="inline-block rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-6 py-3 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all"
            >
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <BookListingCard
                key={listing.id}
                listing={listing}
                variant="my-listings"
                onDelete={handleDelete}
                isDeleting={deletingId === listing.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

