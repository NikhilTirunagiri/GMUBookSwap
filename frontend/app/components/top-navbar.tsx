"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useCart } from "../contexts/CartContext";

export default function TopNavbar() {
  const router = useRouter();
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await logout();
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-10 backdrop-blur-lg bg-emerald-950/70 border-b border-yellow-600 shadow-lg">
      <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/listing" className="flex items-center gap-3">
          <img
            src="/gmu-logo.jpg?v=2"
            alt="George Mason University"
            className="h-10 w-auto rounded-md shadow-[0_0_10px_rgba(255,215,0,0.6)] hover:scale-110 transition-transform"
          />
          <span className="text-3xl font-extrabold tracking-wide text-yellow-400 drop-shadow-lg">
            GMUBookSwap
          </span>
        </Link>
        <nav className="flex gap-3">
          <Link
            href="/listing"
            className="rounded-full border border-yellow-400/70 bg-yellow-500/10 hover:bg-yellow-400/20 px-4 py-1 text-yellow-300 font-medium transition-all shadow-sm backdrop-blur-md"
          >
            Buy
          </Link>
          <Link
            href="/sell"
            className="rounded-full border border-yellow-400/70 bg-yellow-500/10 hover:bg-yellow-400/20 px-4 py-1 text-yellow-300 font-medium transition-all shadow-sm backdrop-blur-md"
          >
            Sell
          </Link>
          <Link
            href="/my-listings"
            className="rounded-full border border-yellow-400/70 bg-yellow-500/10 hover:bg-yellow-400/20 px-4 py-1 text-yellow-300 font-medium transition-all shadow-sm backdrop-blur-md"
          >
            My Listings
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full border border-yellow-400/70 bg-yellow-500/10 hover:bg-yellow-400/20 px-4 py-1 text-yellow-300 font-medium transition-all shadow-sm backdrop-blur-md"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-full border border-red-400/70 bg-red-500/10 hover:bg-red-400/20 px-4 py-1 text-red-300 font-medium transition-all shadow-sm backdrop-blur-md"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
