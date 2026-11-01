import { writeFileSync, existsSync } from "node:fs";
import { localStatus } from "./supabase.mjs";
if (existsSync(".env.local") && !process.argv.includes("--replace"))
  throw new Error(
    ".env.local이 이미 있습니다. 확인 후 --replace를 명시하세요.",
  );
const s = localStatus();
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${s.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${s.ANON_KEY}\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n`,
  { mode: 0o600 },
);
console.log(
  "실행 중인 로컬 Supabase의 실제 공개 연결 정보를 .env.local에 저장했습니다.",
);
