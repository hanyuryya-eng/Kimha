import type { NextConfig } from "next";
import { backendEnvironment, environment } from "./src/lib/environment";
// Refuse accidental localhost DB connections and partial credentials on Vercel.
const backend = backendEnvironment();
// An anonymous local build receives its public hostname only after upload.
if (
  process.env.VERCEL !== "1" ||
  backend === "supabase" ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL
)
  environment();
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};
export default config;
