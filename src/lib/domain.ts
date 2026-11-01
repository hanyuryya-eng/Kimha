import { z } from "zod";
export const noteKinds = {
  impression: "나의 감상",
  interpretation: "가사 해석",
  knowledge: "음악 지식",
  concert: "공연 기록",
} as const;
export const progressLabels = {
  new: "처음 듣는 곡",
  familiar: "익숙해진 곡",
  singalong: "함께 부를 수 있는 곡",
} as const;
export const visibilitySchema = z.enum(["private", "public"]);
export const noteSchema = z.object({
  track_id: z.uuid(),
  body: z.string().trim().min(1, "한 줄이라도 적어 주세요.").max(3000),
  kind: z.enum(["impression", "interpretation", "knowledge", "concert"]),
  visibility: visibilitySchema.default("private"),
});
export const playlistSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  visibility: visibilitySchema.default("private"),
});
export const contributionSchema = z.object({
  track_id: z.union([z.uuid(), z.literal("")]),
  kind: z.enum([
    "metadata",
    "artist",
    "background",
    "story",
    "interpretation",
    "error",
    "track_request",
  ]),
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
  source_url: z
    .string()
    .refine((v) => !v || !!safeHttps(v), "HTTPS 출처를 입력해 주세요."),
});
export function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}
export function safeHttps(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
const musicHosts: Record<string, string[]> = {
  spotify: ["open.spotify.com"],
  apple: ["music.apple.com"],
  youtube: ["www.youtube.com", "youtube.com", "youtu.be"],
  bandcamp: ["bandcamp.com"],
  melon: ["www.melon.com", "melon.com"],
};
export function safeMusicUrl(service: string, url: string) {
  const clean = safeHttps(url);
  if (!clean) return null;
  const host = new URL(clean).hostname;
  return musicHosts[service]?.some(
    (h) =>
      host === h || (service === "bandcamp" && host.endsWith(".bandcamp.com")),
  )
    ? clean
    : null;
}
export function mayShowLyrics(
  rights: {
    status: string;
    license_reference: string | null;
    expires_at: string | null;
    translation_allowed?: boolean;
    pronunciation_allowed?: boolean;
  } | null,
  now = Date.now(),
) {
  return (
    !!rights &&
    rights.status === "verified" &&
    !!rights.license_reference &&
    (!rights.expires_at || new Date(rights.expires_at).getTime() > now)
  );
}
export function localPath(value: unknown, fallback = "/library") {
  if (typeof value !== "string" || !/^\/(?!\/)[a-zA-Z0-9/_?=&%-]*$/.test(value))
    return fallback;
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /[\r\n]/.test(decoded)
      ? fallback
      : value;
  } catch {
    return fallback;
  }
}
