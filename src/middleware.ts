import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

// Protects frontend pages. API routes enforce auth themselves (returning 401 JSON).
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const userId = token ? await verifyToken(token) : null;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!userId && !isAuthPage) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE_NAME); // clear invalid/expired token
    return res;
  }
  if (userId && isAuthPage) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/projects/:path*"] };
