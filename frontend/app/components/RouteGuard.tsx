"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/api";

const PROTECTED_ROUTES = ["/listing", "/sell", "/my-listings", "/cart"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if current route requires authentication
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
      pathname.startsWith(route)
    );

    if (isProtectedRoute && !isAuthenticated()) {
      // Redirect to login with return URL
      router.push(`/?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
