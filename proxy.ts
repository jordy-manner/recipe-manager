import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Maintenance mode (Next 16: "Proxy", formerly Middleware). When APP_MAINTENANCE
// is true, every request returns a 503 « En construction » page — except for the
// owner bypass. Driven by env: enabled only on Vercel Production; off in Preview/local.
//
// The Proxy runs on the Node.js runtime (the default in Next 16) → the env is read
// at RUNTIME (not frozen at build time). Toggling APP_MAINTENANCE still requires a
// redeploy, since Vercel binds env variables to a given deployment.

const BYPASS_COOKIE = "mnt_bypass";

// Accepts the usual boolean values: true, 1, on, yes, y (case- and whitespace-
// insensitive). Everything else (empty, false, 0…) = disabled.
function isTruthy(value: string | undefined): boolean {
  return value != null && ["true", "1", "on", "yes", "y"].includes(value.trim().toLowerCase());
}

const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>En construction</title>
<style>
  :root { color-scheme: light dark; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    min-height: 100%; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #fafafa; color: #18181b;
  }
  @media (prefers-color-scheme: dark) { body { background: #0a0a0a; color: #ededed; } }
  main { text-align: center; max-width: 32rem; }
  .emoji { font-size: 3rem; line-height: 1; }
  h1 { font-size: 1.5rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  p { margin: 0; color: #71717a; }
</style>
</head>
<body>
  <main>
    <div class="emoji">🚧</div>
    <h1>En construction</h1>
    <p>Le site est en cours de préparation. Revenez bientôt&nbsp;!</p>
  </main>
</body>
</html>`;

/** Pass the request through, exposing the pathname to Server Components
 *  (read via `headers().get("x-pathname")` — used by the Breadcrumb). */
function passthrough(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest) {
  // Not in maintenance → let it through.
  if (!isTruthy(process.env.APP_MAINTENANCE)) {
    return passthrough(request);
  }

  const bypassSecret = process.env.APP_MAINTENANCE_BYPASS;

  // Bypass already granted (cookie set previously).
  if (bypassSecret && request.cookies.get(BYPASS_COOKIE)?.value === bypassSecret) {
    return passthrough(request);
  }

  // Bypass request via ?unlock=<secret> → sets the cookie and cleans up the URL.
  const unlock = request.nextUrl.searchParams.get("unlock");
  if (bypassSecret && unlock === bypassSecret) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("unlock");
    const res = NextResponse.redirect(url);
    res.cookies.set(BYPASS_COOKIE, bypassSecret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  // Otherwise: 503 « En construction » page.
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "Cache-Control": "no-store",
    },
  });
}

// Applies to all routes except Next's internal assets and the favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
