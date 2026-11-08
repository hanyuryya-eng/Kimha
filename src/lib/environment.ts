type EnvironmentInput = {
  dataMode?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  siteUrl?: string;
  hosted?: boolean;
  vercelEnvironment?: string;
  vercelUrl?: string;
  productionUrl?: string;
};

function isLocal(hostname: string) {
  return (
    ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(hostname) ||
    hostname.endsWith(".localhost")
  );
}

function origin(value: string, name: string, hosted: boolean) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name}: 올바른 URL을 설정해 주세요.`);
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error(
      `${name}: 경로·인증 정보가 없는 기본 주소를 설정해 주세요.`,
    );
  }
  if (
    hosted
      ? parsed.protocol !== "https:" || isLocal(parsed.hostname)
      : !["https:", "http:"].includes(parsed.protocol)
  ) {
    throw new Error(`${name}: 배포 환경에는 외부 HTTPS 주소가 필요합니다.`);
  }
  return parsed.origin;
}

export function resolveBackend(input: EnvironmentInput): "demo" | "supabase" {
  const mode = input.dataMode || "auto";
  if (!["auto", "demo", "supabase"].includes(mode))
    throw new Error(
      "JI_EUM_DATA_MODE는 auto, demo, supabase 중 하나여야 합니다.",
    );
  let backend: "demo" | "supabase" = "demo";
  if (mode !== "demo") {
    if (
      !!input.supabaseUrl !== !!input.supabaseKey ||
      (mode === "supabase" && !input.supabaseUrl)
    ) {
      throw new Error("Supabase URL과 공개 키를 함께 설정해 주세요.");
    }
    if (input.supabaseUrl && input.supabaseKey) {
      origin(input.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL", !!input.hosted);
      if (input.supabaseKey.startsWith("sb_secret_"))
        throw new Error("웹 앱에는 Supabase 공개 키만 사용할 수 있습니다.");
      const payload = input.supabaseKey.split(".")[1];
      if (payload) {
        try {
          const decoded = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
          );
          if (decoded.role === "service_role") throw new Error("service_role");
        } catch (error) {
          if (error instanceof Error && error.message === "service_role")
            throw new Error("웹 앱에는 service_role 키를 사용할 수 없습니다.");
        }
      }
      backend = "supabase";
    }
  }
  return backend;
}

export function resolveEnvironment(
  input: EnvironmentInput,
  requestOrigin?: string,
) {
  const backend = resolveBackend(input);
  const inferred =
    input.vercelEnvironment === "production" && input.productionUrl
      ? input.productionUrl
      : input.vercelUrl;
  const siteOrigin = input.siteUrl
    ? origin(input.siteUrl, "NEXT_PUBLIC_SITE_URL", !!input.hosted)
    : requestOrigin
      ? origin(requestOrigin, "REQUEST_ORIGIN", !!input.hosted)
      : inferred
        ? origin(`https://${inferred}`, "VERCEL_URL", true)
        : input.hosted
          ? (() => {
              throw new Error(
                "배포 주소를 확인할 수 없습니다. NEXT_PUBLIC_SITE_URL을 설정해 주세요.",
              );
            })()
          : "http://localhost:3000";
  return {
    backend,
    siteOrigin,
    preview: input.vercelEnvironment === "preview",
  };
}

export function publicSupabaseEnvironment() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

function environmentInput(): EnvironmentInput {
  // Explicit property access also lets Next.js inline public values at build time.
  const { url, key } = publicSupabaseEnvironment();
  return {
    dataMode: process.env.JI_EUM_DATA_MODE,
    supabaseUrl: url,
    supabaseKey: key,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    hosted: process.env.VERCEL === "1",
    vercelEnvironment: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };
}

export function backendEnvironment() {
  return resolveBackend(environmentInput());
}

export function requestSiteOrigin(host: string | null) {
  // A staged production build may not have an assigned domain yet.
  // Use the requested origin only for known deployment hosts.
  if (
    !host ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:vercel\.app|tmp\.now)$/i.test(host)
  )
    return undefined;
  return `https://${host.toLowerCase()}`;
}

export function environment(requestOrigin?: string) {
  return resolveEnvironment(environmentInput(), requestOrigin);
}
