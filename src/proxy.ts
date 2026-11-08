import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  backendEnvironment,
  publicSupabaseEnvironment,
} from "@/lib/environment";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (backendEnvironment() === "demo") return response;
  const { url, key } = publicSupabaseEnvironment();
  if (!url || !key) return response;
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|covers|icon.svg|sw.js|manifest.webmanifest).*)",
  ],
};
