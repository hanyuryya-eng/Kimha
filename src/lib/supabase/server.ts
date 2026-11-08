import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  backendEnvironment,
  publicSupabaseEnvironment,
} from "@/lib/environment";
export function isConfigured() {
  return backendEnvironment() === "supabase";
}
export async function supabase() {
  if (!isConfigured()) return null;
  const jar = await cookies();
  const { url, key } = publicSupabaseEnvironment();
  return createServerClient(url!, key!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server components cannot write; proxy refreshes sessions. */
        }
      },
    },
  });
}
