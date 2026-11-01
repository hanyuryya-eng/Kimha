import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "지음 — 음악을 좀 더 가까이.",
    short_name: "지음",
    description: "당신의 디지털 음악 서재",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#151615",
    theme_color: "#151615",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
