import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Quick check only: no session cookie → send to the login page.
// The real checks (valid session, admin vs staff) happen in every page and
// server action via requireUser() / requireAdmin() in lib/auth.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
